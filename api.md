# Ride API reference

Base URL (local): `http://localhost:4000`  
API prefix: `/api/v1`

Unless noted, JSON bodies use `Content-Type: application/json`. Rider **register user** uses `multipart/form-data` (see below).

Authenticated requests send:

```http
Authorization: Bearer <JWT>
```

JWT payload includes `sub` (user id) and `role` (`user` | `captain` | `admin`).

---

## Health

```bash
curl -s http://localhost:4000/health
```

---

## Auth — rider (`user`)

### Register user

`multipart/form-data` only. Text fields: `fullName`, `phone` (Egyptian mobile), `email`, `password`, `confirmPassword`. File field: `profileImage` (jpeg, png, webp, or gif; max 5 MB).

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register/user \
  -F "fullName=Sara Ali" \
  -F "phone=01012345678" \
  -F "email=sara@example.com" \
  -F "password=secret123" \
  -F "confirmPassword=secret123" \
  -F "profileImage=@/path/to/photo.jpg"
```

Phone is normalized to E.164 (`+201012345678`). Accepts `01…`, `+20…`, etc.

Optional: add `role=admin` to create an admin user instead of a normal `user`. When `role=admin` is provided, the response token will contain `role: "admin"` and can be used to call admin endpoints like `GET /api/v1/users`.

Example (create admin):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register/user \
  -F "fullName=Admin User" \
  -F "phone=01022223333" \
  -F "email=admin@example.com" \
  -F "password=secret123" \
  -F "confirmPassword=secret123" \
  -F "role=admin" \
  -F "profileImage=@/path/to/photo.jpg"
```

### Login user (phone only)

No password. Send **only** `phone` using one of:

**Multipart form-data** (Postman “form-data”, all keys type Text):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login/user \
  -F "phone=01012345678"
```

**URL-encoded** body:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login/user \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "phone=01012345678"
```

**JSON** (single field):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login/user \
  -H "Content-Type: application/json" \
  -d '{"phone":"01012345678"}'
```

Response includes `token` and `user` (no password hash).

**Security note:** phone-only login means anyone who knows the number can obtain a session. Use only in trusted environments or add OTP / device binding before production.

---

## Auth — captain (`captain`)

Two-step registration. Step 1 returns a JWT; use it for step 2. `carImageId` is an **image** of the vehicle registration / ID document (not a MongoDB id).

### Captain — step 1 (multipart)

Form fields: `fullName`, `email`, `phone`, `password`, `confirmPassword`  
File field: `profileImage` (jpeg, png, webp, or gif; max 5 MB).

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register/captain/step1 \
  -F "fullName=Captain Ahmed" \
  -F "email=ahmed@example.com" \
  -F "phone=01098765432" \
  -F "password=secret123" \
  -F "confirmPassword=secret123" \
  -F "profileImage=@/path/to/photo.jpg"
```

### Captain — step 2 (multipart, JWT required)

All file fields are required: `carImage`, `carImageId`, `personIdImage`, `criminalRecordImage`, `personSelfy`.

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register/captain/step2 \
  -H "Authorization: Bearer <TOKEN_FROM_STEP1>" \
  -F "carImage=@/path/to/car.jpg" \
  -F "carImageId=@/path/to/registration-doc.jpg" \
  -F "personIdImage=@/path/to/national-id.jpg" \
  -F "criminalRecordImage=@/path/to/criminal-record.jpg" \
  -F "personSelfy=@/path/to/selfie.jpg"
```

After success, `captainRegistrationStep` becomes `complete` and a new `token` may be returned.

### Login captain (after step 2)

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login/captain \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "01098765432",
    "password": "secret123"
  }'
```

If step 2 is not finished, login returns `403` with `REGISTRATION_INCOMPLETE`.

---

## Users CRUD

All routes are under `/api/v1/users`. Most require a JWT.

### Get current profile

```bash
curl -s http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer <JWT>"
```

### List users (admin only)

Query: `page` (default 1), `limit` (default 20, max 100).

```bash
curl -s "http://localhost:4000/api/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

### Create user (admin only)

Creates a fully registered `user`, `captain`, or `admin`. Captains created here get `captainRegistrationStep: complete` (no document uploads in this endpoint).

```bash
curl -s -X POST http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Admin Created",
    "phone": "01011112222",
    "email": "created@example.com",
    "password": "secret123",
    "confirmPassword": "secret123",
    "role": "user"
  }'
```

### Get user by id (self or admin)

```bash
curl -s http://localhost:4000/api/v1/users/<USER_ID> \
  -H "Authorization: Bearer <JWT>"
```

### Update user (self or admin)

Self may update: `fullName`, `phone`, `email`, `password` + `confirmPassword`.  
Admin may also set: `role`, `captainRegistrationStep`, and stored image paths (`profileImage`, `carImage`, `carImageId`, `personIdImage`, `criminalRecordImage`, `personSelfy`) as path strings (e.g. `/uploads/uuid.jpg`).

```bash
curl -s -X PATCH http://localhost:4000/api/v1/users/<USER_ID> \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "fullName": "Sara A. Ali" }'
```

### Delete user (admin only)

```bash
curl -s -X DELETE http://localhost:4000/api/v1/users/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

Returns `204` with no body on success.

---

## Trips (existing)

Requires JWT. Trip `captainId` must reference a **captain** with completed registration.

```bash
curl -s http://localhost:4000/api/v1/trips \
  -H "Authorization: Bearer <JWT>"
```

---

## Static uploads

Uploaded files are served at `/uploads/<filename>`.  
User JSON may return absolute image URLs if `API_PUBLIC_URL` is set in `.env`; otherwise URLs are built from the request host.

---

## Admin bootstrap

There is no open `admin` self-signup. Options:

1. Insert an admin document in MongoDB Atlas (with a **bcrypt** hash for `passwordHash` — easiest is to register any user, copy hash from DB, then change `role` to `admin`), or  
2. Use `POST /api/v1/users` with an existing admin JWT after the first admin exists.

---

## Errors

Typical JSON error shape:

```json
{ "message": "…", "code": "OPTIONAL_CODE" }
```

Common codes: `INVALID_PHONE`, `PASSWORD_MISMATCH`, `INVALID_CREDENTIALS`, `REGISTRATION_INCOMPLETE`, `UNAUTHORIZED`, `FORBIDDEN`.
