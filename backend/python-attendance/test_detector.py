#!/usr/bin/env python3
"""
Hardcore Face Detector Test
Tests the multi-scale face detection pipeline against local images or URLs.
"""

import base64
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

import cv2
import numpy as np
import face_recognition


def load_image_file(path_or_url: str) -> np.ndarray:
    """Load image from file path or URL."""
    if path_or_url.startswith('http://') or path_or_url.startswith('https://'):
        print(f"  Fetching from URL: {path_or_url}")
        with urllib.request.urlopen(path_or_url, timeout=10) as response:
            image_data = np.frombuffer(response.read(), dtype=np.uint8)
    else:
        path = Path(path_or_url)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path_or_url}")
        print(f"  Loading from file: {path_or_url}")
        image_data = np.fromfile(path, dtype=np.uint8)

    image_bgr = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise ValueError("Unable to decode image")
    return image_bgr


def detect_faces_multi_scale(image_bgr: np.ndarray, verbose: bool = True) -> tuple:
    """Detect faces with multi-scale and adaptive upsample."""
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    h, w = image_rgb.shape[:2]

    print(f"\n  Image shape: {h}x{w} pixels")

    # Downscale if very large
    MAX_EDGE = 2200
    long_edge = max(h, w)
    if long_edge > MAX_EDGE:
        scale_down = MAX_EDGE / float(long_edge)
        image_rgb = cv2.resize(image_rgb, None, fx=scale_down, fy=scale_down, interpolation=cv2.INTER_AREA)
        h, w = image_rgb.shape[:2]
        print(f"  Downscaled to: {h}x{w} pixels")

    scales = [1.0, 1.4, 1.8]
    all_locations = []
    all_encodings = []
    scale_used = None

    for scale_idx, scale in enumerate(scales, 1):
        if scale == 1.0:
            working_rgb = image_rgb
        else:
            interpolation = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
            working_rgb = cv2.resize(image_rgb, None, fx=scale, fy=scale, interpolation=interpolation)

        for upsample in [1, 2]:
            if verbose:
                print(f"\n  Attempt {scale_idx}.{upsample}: Scale={scale}, Upsample={upsample}")

            try:
                locations_scaled = face_recognition.face_locations(
                    working_rgb,
                    number_of_times_to_upsample=upsample,
                    model="cnn",
                )

                if not locations_scaled:
                    if verbose:
                        print(f"    No faces detected")
                    continue

                print(f"    Found {len(locations_scaled)} face(s)")

                # Rescale locations back to original size
                if scale != 1.0:
                    rescaled = []
                    for top, right, bottom, left in locations_scaled:
                        o_top = max(0, min(h - 1, int(round(top / scale))))
                        o_right = max(0, min(w - 1, int(round(right / scale))))
                        o_bottom = max(0, min(h - 1, int(round(bottom / scale))))
                        o_left = max(0, min(w - 1, int(round(left / scale))))
                        if o_bottom > o_top and o_right > o_left:
                            rescaled.append((o_top, o_right, o_bottom, o_left))
                    locations_scaled = rescaled

                encodings = face_recognition.face_encodings(image_rgb, locations_scaled)
                if encodings:
                    print(f"    Successfully extracted {len(encodings)} encoding(s)")
                    all_locations.extend(locations_scaled)
                    all_encodings.extend(encodings)
                    scale_used = f"scale={scale}, upsample={upsample}"
                    break
            except Exception as e:
                if verbose:
                    print(f"    Error: {e}")
                continue

        if all_encodings:
            print(f"\n  ✓ Detection succeeded at scale={scale}, upsample={upsample}")
            break

    if not all_encodings:
        print(f"\n  ✗ No faces detected across all scales")
        return [], []

    print(f"  Total detected: {len(all_encodings)} face(s)")
    return all_locations, all_encodings


def test_image(image_path: str):
    """Test face detection on a single image."""
    print(f"\n{'='*70}")
    print(f"Testing: {image_path}")
    print(f"{'='*70}")

    try:
        image_bgr = load_image_file(image_path)
        locations, encodings = detect_faces_multi_scale(image_bgr, verbose=True)

        if not encodings:
            print(f"\nResult: FAILED - No faces detected")
            return False

        print(f"\nResult: SUCCESS - Detected {len(encodings)} face(s)")
        for i, (top, right, bottom, left) in enumerate(locations, 1):
            height = bottom - top
            width = right - left
            print(f"  Face {i}: {width}x{height} pixels at ({left},{top})")

        return True

    except Exception as e:
        print(f"\nError: {e}")
        return False


def test_api_endpoint(image_path: str, student_count: int = 6):
    """Test the actual API endpoint."""
    print(f"\n{'='*70}")
    print(f"Testing API Endpoint")
    print(f"{'='*70}")

    try:
        # Load and encode image
        image_bgr = load_image_file(image_path)
        _, buffer = cv2.imencode('.jpg', image_bgr)
        image_base64 = base64.b64encode(buffer).decode('utf-8')

        # Create mock known faces (with URLs pointing to placeholder images)
        known_faces = []
        for i in range(student_count):
            known_faces.append({
                "student_id": f"STU{i+1:03d}",
                "encoding": None,  # No encoding - will try base64 if provided or skip
            })

        payload = {
            "image_base64": f"data:image/jpeg;base64,{image_base64}",
            "known_faces": known_faces,
            "tolerance": 0.48,
        }

        print(f"\n  Sending request to http://127.0.0.1:8001/match-faces")
        print(f"  Image size: {len(image_base64)} bytes (base64)")
        print(f"  Known faces: {len(known_faces)}")

        req = urllib.request.Request(
            "http://127.0.0.1:8001/match-faces",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))

        print(f"\nAPI Response:")
        print(f"  Success: {result.get('success', False)}")
        print(f"  Total detected: {result.get('total_detected_faces', 0)} faces")
        print(f"  Total matched: {result.get('total_matched_faces', 0)} faces")
        print(f"  Matched IDs: {result.get('matched_student_ids', [])}")
        print(f"  Message: {result.get('message', 'N/A')}")

        return result.get('total_detected_faces', 0) > 0

    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """Run tests."""
    print("\n" + "="*70)
    print("HARDCORE FACE RECOGNITION TEST")
    print("="*70)

    # Try to test with a sample image if provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        print(f"\nTest mode: Single image")
        print(f"Testing local detection pipeline...")
        success = test_image(image_path)

        if success:
            print(f"\nTesting API endpoint...")
            test_api_endpoint(image_path, student_count=6)
    else:
        print(f"\nUsage: python test_detector.py <image_path_or_url>")
        print(f"\nExample:")
        print(f"  python test_detector.py path/to/class_photo.jpg")
        print(f"  python test_detector.py https://example.com/classroom.jpg")
        print(f"\nNo image provided. Skipping detection test.")
        print(f"\nYou can:")
        print(f"  1. Provide a classroom photo for testing")
        print(f"  2. Use the web UI to test with Realtime Camera mode")
        print(f"  3. Upload a class photo from your device")


if __name__ == "__main__":
    main()
