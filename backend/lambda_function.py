import base64
import binascii
import json
import os
import time
import uuid
from decimal import Decimal
from urllib.parse import unquote

import boto3
from botocore.exceptions import ClientError


s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET_NAME = os.environ["ASSIGNMENTS_BUCKET"]
TABLE_NAME = os.environ["SUBMISSIONS_TABLE"]
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
MAX_FILE_BYTES = int(os.environ.get("MAX_FILE_BYTES", str(6 * 1024 * 1024)))

table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")
    path = event.get("rawPath") or event.get("path", "/")

    if method == "OPTIONS":
        return response(204, {})

    try:
        if method == "POST" and path.endswith("/submissions"):
            return create_submission(event)
        if method == "GET" and path.endswith("/submissions"):
            return list_submissions()
        if method == "GET" and path.endswith("/download"):
            submission_id = extract_submission_id(path)
            return create_download_url(submission_id)
        return response(404, {"message": "Route not found."})
    except ValueError as error:
        return response(400, {"message": str(error)})
    except ClientError as error:
        print(json.dumps({"awsError": error.response.get("Error", {})}))
        return response(500, {"message": "AWS service request failed."})
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        return response(500, {"message": "Unexpected server error."})


def create_submission(event):
    body = parse_body(event)
    required = ["studentName", "studentId", "course", "assignmentTitle", "fileName", "fileContent"]
    missing = [field for field in required if not body.get(field)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    file_name = sanitize_file_name(body["fileName"])
    try:
        file_bytes = base64.b64decode(body["fileContent"], validate=True)
    except binascii.Error as error:
        raise ValueError("File content must be valid base64.") from error
    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValueError("File must be smaller than 6 MB.")
    submission_id = str(uuid.uuid4())
    submitted_at = iso_now()
    object_key = f"assignments/{body['studentId']}/{submission_id}/{file_name}"

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
        ContentType=body.get("fileType") or "application/octet-stream",
        Metadata={
            "student-id": str(body["studentId"]),
            "assignment-title": str(body["assignmentTitle"])[:256],
        },
    )

    item = {
        "submissionId": submission_id,
        "studentName": body["studentName"],
        "studentId": body["studentId"],
        "course": body["course"],
        "assignmentTitle": body["assignmentTitle"],
        "fileName": file_name,
        "fileType": body.get("fileType") or "application/octet-stream",
        "fileSize": Decimal(str(body.get("fileSize") or len(file_bytes))),
        "objectKey": object_key,
        "submittedAt": submitted_at,
    }
    table.put_item(Item=item)

    public_item = to_public_item(item)
    return response(201, public_item)


def list_submissions():
    result = table.scan(Limit=100)
    items = sorted(result.get("Items", []), key=lambda item: item.get("submittedAt", ""), reverse=True)
    return response(200, {"submissions": [to_public_item(item) for item in items]})


def create_download_url(submission_id):
    if not submission_id:
        raise ValueError("Submission ID is required.")

    result = table.get_item(Key={"submissionId": submission_id})
    item = result.get("Item")
    if not item:
        return response(404, {"message": "Submission not found."})

    download_url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": item["objectKey"],
            "ResponseContentDisposition": f"attachment; filename=\"{item['fileName']}\"",
        },
        ExpiresIn=900,
    )
    return response(200, {"downloadUrl": download_url})


def parse_body(event):
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")
    try:
        return json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ValueError("Request body must be valid JSON.") from error


def extract_submission_id(path):
    parts = [part for part in path.split("/") if part]
    try:
        index = parts.index("submissions")
        return unquote(parts[index + 1])
    except (ValueError, IndexError):
        return ""


def sanitize_file_name(file_name):
    cleaned = "".join(char for char in file_name if char.isalnum() or char in ("-", "_", ".", " ")).strip()
    if not cleaned or "." not in cleaned:
        raise ValueError("File name must include an extension.")
    extension = cleaned.rsplit(".", 1)[1].lower()
    if extension not in {"pdf", "doc", "docx"}:
        raise ValueError("Only PDF, DOC, and DOCX files are accepted.")
    return cleaned


def to_public_item(item):
    return {
        "submissionId": item["submissionId"],
        "studentName": item["studentName"],
        "studentId": item["studentId"],
        "course": item["course"],
        "assignmentTitle": item["assignmentTitle"],
        "fileName": item["fileName"],
        "fileType": item.get("fileType", "application/octet-stream"),
        "fileSize": int(item.get("fileSize", 0)),
        "submittedAt": item["submittedAt"],
    }


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def iso_now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
