API Key
ea01938d51d3233
api_key
API Secret
e8125170e667327

token ea01938d51d3233:e8125170e667327
# Change of Name API Documentation

## Endpoint

**URL:** `/api/method/nacstnew.nacstnew.doctype.change_of_name.change_of_name.create_and_submit_change_of_name`

**Method:** `POST`

**Authentication:** Required (User must be logged in)

## Description

This API endpoint creates and submits a Change of Name document, which automatically updates the Personnel record with the new name information.

## Request Format

### Headers
```
Content-Type: application/json
Authorization: api_key:api_secret
```
OR
```
Cookie: sid=<session_id>
```

### Request Body (JSON)

```json
{
  "service_number": "PERSONNEL_SERVICE_NUMBER",
  "new_name": "NEW_FIRST_NAME",
  "new_middle_name": "NEW_MIDDLE_NAME",
  "new_other_name": "NEW_OTHER_NAME",
  "new_personnel_name": "NEW_PERSONNEL_NAME",
  "new_surname": "NEW_SURNAME",
  "authority": "/path/to/authority/file.pdf"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_number` | string | Yes | Service number of the Personnel record to update |
| `new_name` | string | No* | New first name (will be converted to uppercase) |
| `new_middle_name` | string | No* | New middle name (will be converted to uppercase) |
| `new_other_name` | string | No* | New other name (will be converted to uppercase) |
| `new_personnel_name` | string | No* | New personnel name (will be converted to uppercase) |
| `new_surname` | string | No* | New surname (will be converted to uppercase) |
| `authority` | string | No | Path to authority document attachment |

\* At least one new name field must be provided.

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Change of Name document created and submitted successfully. Personnel record PERSONNEL_SERVICE_NUMBER has been updated.",
  "document": {
    "name": "CHG-00001",
    "service_number": "PERSONNEL_SERVICE_NUMBER",
    "docstatus": 1
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Postman Testing Instructions

### Step 1: Set up Authentication

1. **Option A: Using API Key/Secret**
   - Go to your Frappe site
   - Navigate to User settings → API Access
   - Generate API Key and API Secret
   - In Postman, go to Authorization tab
   - Select "Basic Auth" or add headers:
     - `Authorization: api_key:api_secret`

2. **Option B: Using Session Cookie**
   - Login to your Frappe site in a browser
   - Open Developer Tools → Application/Storage → Cookies
   - Copy the `sid` cookie value
   - In Postman, add a header:
     - `Cookie: sid=<your_session_id>`

### Step 2: Configure Request

1. **Method:** Select `POST`
2. **URL:** 
   ```
   http://your-site-url/api/method/nacstnew.nacstnew.doctype.change_of_name.change_of_name.create_and_submit_change_of_name
   ```
   Replace `your-site-url` with your actual Frappe site URL.

3. **Headers:**
   - `Content-Type: application/json`
   - Add authentication header (from Step 1)

4. **Body:**
   - Select `raw`
   - Select `JSON` from dropdown
   - Enter JSON payload:

```json
{
  "service_number": "12345",
  "new_name": "John",
  "new_surname": "Doe",
  "new_personnel_name": "JD Doe"
}
```

### Step 3: Send Request

Click "Send" and check the response.

### Example Request (cURL)

```bash
curl -X POST \
  'http://your-site-url/api/method/nacstnew.nacstnew.doctype.change_of_name.change_of_name.create_and_submit_change_of_name' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: api_key:api_secret' \
  -d '{
    "service_number": "12345",
    "new_name": "John",
    "new_surname": "Doe",
    "new_personnel_name": "JD Doe"
  }'
```

## Notes

- All name fields are automatically converted to UPPERCASE
- The Personnel record is automatically updated when the Change of Name document is submitted
- The document is created and submitted in a single API call
- Requires authentication (cannot be accessed as guest)
- The endpoint validates that:
  - `service_number` exists in Personnel doctype
  - At least one new name field is provided

## Error Codes

| Error | Description |
|-------|-------------|
| `service_number is required` | Missing required service_number field |
| `Personnel record {service_number} does not exist` | The provided service number doesn't exist |
| `At least one new name field must be provided` | No new name fields were provided |
| `Invalid JSON format` | Request body is not valid JSON |
| `Validation error: {message}` | Document validation failed |




