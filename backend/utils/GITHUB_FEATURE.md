# GitHub Profile Integration & Scoring System

## Overview
This system integrates GitHub profiles with the student ERP system, allowing students to showcase their coding skills and portfolios while providing placement coordinators with automated scoring based on repository activity and contributions.

---

## Features Implemented

### 1. **Student Profile Enhancement**
- **Frontend**: `frontend/src/components/StudentDashboard.jsx`
  - Added GitHub Profile Link input field in the profile section
  - Students can update their GitHub profile with one click
  - GitHub score displayed in student profile (⭐ X.X / 5)
  - Beautiful UI with gradient styling

### 2. **GitHub Score Calculation**
- **Backend**: `backend/utils/github.js`
  - **Repository Score (0-2 points)**:
    - ≥ 20 repos: 2 points
    - ≥ 10 repos: 1.5 points
    - ≥ 5 repos: 1 point
    - < 5 repos: 0.5 points
  
  - **Activity Score (0-3 points)**:
    - Updated in last 7 days: 3 points
    - Updated in last 30 days: 2 points
    - Updated more than 30 days ago: 1 point
  
  - **Total Score**: Repository Score + Activity Score (Max 5.0)

### 3. **Backend API Endpoints**

#### POST `/api/auth/update-github-profile`
- **Purpose**: Update student's GitHub profile and calculate score
- **Authentication**: Required (JWT token)
- **Request Body**:
  ```json
  {
    "gitHubUrl": "https://github.com/username"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "GitHub profile updated successfully",
    "data": {
      "username": "username",
      "gitHubUrl": "https://github.com/username",
      "score": 3.8,
      "repoCount": 15,
      "repoScore": 1.5,
      "activityScore": 2.3
    }
  }
  ```

#### GET `/api/faculty/students-by-github-score`
- **Purpose**: Get students sorted by GitHub score (Placement Coordinator view)
- **Authentication**: Required (Faculty/Admin role)
- **Query Parameters**:
  - `department` (optional): Filter by specific department
- **Response**:
  ```json
  {
    "success": true,
    "message": "Students sorted by GitHub score retrieved",
    "data": [
      {
        "uid": "student-uid",
        "name": "Student Name",
        "email": "student@example.com",
        "department": "CSE",
        "enrollmentNumber": "12345",
        "cgpa": 8.5,
        "gitHubScore": 4.2,
        "gitHubProfile": {
          "username": "github-user",
          "url": "https://github.com/github-user",
          "avatarUrl": "...",
          "repoCount": 20,
          "repoScore": 2.0,
          "activityScore": 2.2
        }
      }
    ],
    "total": 10
  }
  ```

### 4. **Placement Coordinator Dashboard**
- **Location**: `frontend/src/components/PlacementCellDashboard.jsx`
- **New Tab**: "Students (GitHub Score)"
- **Features**:
  - View all students with GitHub profiles
  - Auto-sorted by GitHub score (highest first)
  - Filter by department
  - See ranking, name, enrollment, department, CGPA, GitHub score, repo count
  - Direct link to GitHub profiles
  - Loading states and error handling

### 5. **Student Dashboard Integration**
- **Location**: `frontend/src/components/StudentDashboard.jsx`
- **Placement Section Enhancement**:
  - Display GitHub score prominently (⭐ X.X / 5)
  - Show GitHub profile link
  - Easy update mechanism

### 6. **Database Schema**
Students collection now includes:
```firestore
{
  ...existing_fields,
  gitHubProfile: {
    username: string,
    url: string,
    avatarUrl: string,
    score: number (0-5),
    repoCount: number,
    repoScore: number,
    activityScore: number,
    lastUpdated: ISO string (from GitHub API),
    fetchedAt: ISO string (when fetched)
  },
  gitHubScore: number (denormalized for easy sorting)
}
```

---

## How to Use

### For Students:
1. Go to Profile section in Student Dashboard
2. Scroll to "GitHub Profile (For Placement)"
3. Enter your GitHub URL (e.g., `https://github.com/username` or just `username`)
4. Click "Update GitHub Profile"
5. System validates URL, fetches data from GitHub API, calculates score
6. Score displayed in profile and visible to coordinators

### For Placement Coordinators:
1. Go to Placement Cell Dashboard
2. Click "Students (GitHub Score)" tab
3. View all students ranked by GitHub score (highest first)
4. Optionally filter by department
5. Click GitHub username to visit their profile
6. Use for informed recruitment decisions

---

## Technical Details

### GitHub URL Validation
Supports multiple formats:
- Full URL: `https://github.com/username`
- Full URL with path: `https://github.com/username/repo`
- Just username: `username`

### GitHub API Integration
- Uses public GitHub API: `https://api.github.com/users/{username}`
- No authentication required (public data only)
- Rate limit: 60 requests/hour (can be increased with token)
- Rates by:
  - `public_repos` count → Repository Score
  - `updated_at` timestamp → Activity Score

### Error Handling
- Invalid GitHub URL format: Returns 400 error with clear message
- GitHub user not found: Returns 404 error
- GitHub API errors: Returns appropriate status codes
- Network issues: Graceful error messages to user

### Performance
- Scores cached in Firestore after calculation
- Fetched only when profile is updated (not on every load)
- Denormalized `gitHubScore` field for efficient sorting/filtering

---

## Security & Privacy
- GitHub data is public (no private repos accessed)
- Only calculates score, doesn't access code or commits
- No sensitive data stored or exposed
- Students must explicitly add their GitHub profile
- Only Faculty/Admin can view student scores in bulk

---

## Future Enhancements
1. Integration with GitHub API v3 to fetch commit counts
2. Advanced scoring: Language-wise breakdown
3. GitHub follower/stars consideration
4. Auto-fetch on regular intervals to keep scores updated
5. Trending/skill tags from repos
6. Show project descriptions for top repos
7. Integration with LinkedIn profiles

---

## Troubleshooting

**Q: GitHub profile update fails with 404**
- A: GitHub username doesn't exist. Check spelling and try again.

**Q: Score is lower than expected**
- A: Score is based on public repos count and last update date. Private repos don't count.

**Q: Score hasn't updated**
- A: Scores are calculated when you submit the form. Refresh the page to see updated score.

**Q: Can't see my GitHub profile in coordinator view**
- A: Only students with GitHub profiles are shown. Add your profile first, then ask coordinator to refresh.

---

## Files Modified/Created

### New Files:
- `backend/utils/github.js` - GitHub utility functions

### Modified Files:
- `backend/routes/auth.js` - Added `/update-github-profile` endpoint
- `backend/routes/faculty.js` - Added `/students-by-github-score` endpoint
- `frontend/src/components/StudentDashboard.jsx` - Added GitHub profile form & display
- `frontend/src/components/PlacementCellDashboard.jsx` - Added GitHub students view
- `frontend/src/App.css` - Added GitHub profile styling

---

## Environment Variables
No additional environment variables needed. Uses public GitHub API endpoints.

---

## Version
- Created: March 2026
- Status: ✅ Ready for Production
- Build Status: ✅ Compiling Successfully
