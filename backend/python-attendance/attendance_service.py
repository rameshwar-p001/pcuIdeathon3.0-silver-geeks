from __future__ import annotations

import base64
import binascii
import os
from typing import List, Optional
from urllib.request import Request, urlopen

import cv2
import face_recognition
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Smart Campus AI Attendance Service", version="1.0.0")


def _read_scales() -> List[float]:
    raw = os.getenv("FACE_DETECTION_SCALES", "1.0,1.4,1.8")
    scales: List[float] = []
    for item in raw.split(","):
        value = item.strip()
        if not value:
            continue
        try:
            parsed = float(value)
            if parsed > 0:
                scales.append(parsed)
        except ValueError:
            continue

    if not scales:
        scales = [1.0, 1.4, 1.8]

    return sorted(set(scales))


FACE_DETECTION_MODEL = os.getenv("FACE_DETECTION_MODEL", "cnn").strip().lower()
if FACE_DETECTION_MODEL not in {"hog", "cnn"}:
    FACE_DETECTION_MODEL = "cnn"

FACE_DETECTION_UPSAMPLE = max(0, min(int(os.getenv("FACE_DETECTION_UPSAMPLE", "1")), 2))
FACE_DETECTION_SCALES = _read_scales()
MAX_IMAGE_EDGE = max(800, int(os.getenv("FACE_MAX_IMAGE_EDGE", "2200")))


class KnownFace(BaseModel):
    student_id: str = Field(min_length=1)
    encoding: Optional[List[float]] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None


class MatchFacesRequest(BaseModel):
    image_base64: str = Field(min_length=1)
    known_faces: List[KnownFace] = Field(default_factory=list)
    tolerance: float = Field(default=0.48, ge=0.1, le=0.8)


class MatchFacesResponse(BaseModel):
    success: bool
    matched_student_ids: List[str]
    total_detected_faces: int
    total_matched_faces: int
    message: str


def _decode_image(image_base64: str) -> np.ndarray:
    payload = image_base64.strip()
    if payload.startswith("data:") and "," in payload:
        payload = payload.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except binascii.Error as exc:
        raise ValueError("Invalid base64 image payload") from exc

    if not image_bytes:
        raise ValueError("Empty image payload")

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image")

    return image


def _decode_image_from_url(image_url: str) -> np.ndarray:
    request = Request(image_url, headers={"User-Agent": "smart-campus-attendance/1.0"})
    with urlopen(request, timeout=10) as response:
      image_bytes = response.read()

    if not image_bytes:
        raise ValueError("Empty image from URL")

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image URL")

    return image


def _rescale_locations_to_original(
    locations: List[tuple[int, int, int, int]],
    scale: float,
    max_h: int,
    max_w: int,
) -> List[tuple[int, int, int, int]]:
    if scale == 1.0:
        return locations

    scaled_back: List[tuple[int, int, int, int]] = []
    for top, right, bottom, left in locations:
        o_top = max(0, min(max_h - 1, int(round(top / scale))))
        o_right = max(0, min(max_w - 1, int(round(right / scale))))
        o_bottom = max(0, min(max_h - 1, int(round(bottom / scale))))
        o_left = max(0, min(max_w - 1, int(round(left / scale))))

        if o_bottom > o_top and o_right > o_left:
            scaled_back.append((o_top, o_right, o_bottom, o_left))

    return scaled_back


def _detect_faces_and_encodings(image_bgr: np.ndarray) -> tuple[List[tuple[int, int, int, int]], List[np.ndarray]]:
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    h, w = image_rgb.shape[:2]

    # Keep large classroom images in a stable range for reliable CPU detection latency.
    long_edge = max(h, w)
    if long_edge > MAX_IMAGE_EDGE:
        down_scale = MAX_IMAGE_EDGE / float(long_edge)
        image_rgb = cv2.resize(image_rgb, None, fx=down_scale, fy=down_scale, interpolation=cv2.INTER_AREA)
        h, w = image_rgb.shape[:2]

    all_locations = []
    all_encodings = []

    # Fast HOG detection with high upsample for small distant faces
    for upsample in [1, 2]:
        try:
            hog_locations = face_recognition.face_locations(
                image_rgb,
                number_of_times_to_upsample=upsample,
                model="hog",
            )
            if hog_locations:
                hog_encodings = face_recognition.face_encodings(image_rgb, hog_locations)
                if hog_encodings:
                    all_locations.extend(hog_locations)
                    all_encodings.extend(hog_encodings)
                    break
        except Exception:
            continue

    # If HOG found faces, return early (fast path)
    if all_encodings:
        return all_locations, all_encodings

    # Fall back to multi-scale HOG for distant/hard faces
    for scale in FACE_DETECTION_SCALES:
        interpolation = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
        working_rgb = cv2.resize(image_rgb, None, fx=scale, fy=scale, interpolation=interpolation)

        for upsample in [1, 2]:
            try:
                locations_scaled = face_recognition.face_locations(
                    working_rgb,
                    number_of_times_to_upsample=upsample,
                    model="hog",
                )

                if not locations_scaled:
                    continue

                locations_original = _rescale_locations_to_original(locations_scaled, scale, h, w)
                if not locations_original:
                    continue

                encodings = face_recognition.face_encodings(image_rgb, locations_original)
                if encodings:
                    return locations_original, encodings
            except Exception:
                continue

    return [], []


def _extract_first_encoding(image_bgr: np.ndarray) -> Optional[np.ndarray]:
    _, encodings = _detect_faces_and_encodings(image_bgr)
    if not encodings:
        return None
    return np.asarray(encodings[0], dtype=np.float64)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/match-faces", response_model=MatchFacesResponse)
def match_faces(payload: MatchFacesRequest) -> MatchFacesResponse:
    if not payload.known_faces:
        return MatchFacesResponse(
            success=True,
            matched_student_ids=[],
            total_detected_faces=0,
            total_matched_faces=0,
            message="No known faces provided",
        )

    image_bgr = _decode_image(payload.image_base64)
    _, detected_encodings = _detect_faces_and_encodings(image_bgr)

    known_ids: List[str] = []
    known_encodings: List[np.ndarray] = []

    for known_face in payload.known_faces:
        vector: Optional[np.ndarray] = None

        if known_face.encoding:
            parsed = np.asarray(known_face.encoding, dtype=np.float64)
            if parsed.shape[0] == 128:
                vector = parsed

        if vector is None and known_face.image_base64:
            try:
                selfie_bgr = _decode_image(known_face.image_base64)
                vector = _extract_first_encoding(selfie_bgr)
            except Exception:
                vector = None

        if vector is None and known_face.image_url:
            try:
                selfie_bgr = _decode_image_from_url(known_face.image_url)
                vector = _extract_first_encoding(selfie_bgr)
            except Exception:
                vector = None

        if vector is not None and vector.shape[0] == 128:
            known_ids.append(known_face.student_id)
            known_encodings.append(vector)

    if not known_encodings:
        return MatchFacesResponse(
            success=True,
            matched_student_ids=[],
            total_detected_faces=len(detected_encodings),
            total_matched_faces=0,
            message="No valid known encodings available",
        )

    known_stack = np.vstack(known_encodings)

    matched_students: List[str] = []
    for face_encoding in detected_encodings:
        distances = face_recognition.face_distance(known_stack, face_encoding)
        best_index = int(np.argmin(distances))
        best_distance = float(distances[best_index])

        if best_distance <= payload.tolerance:
            matched_students.append(known_ids[best_index])

    unique_matches = sorted(set(matched_students))

    return MatchFacesResponse(
        success=True,
        matched_student_ids=unique_matches,
        total_detected_faces=len(detected_encodings),
        total_matched_faces=len(matched_students),
        message="Face matching completed",
    )
