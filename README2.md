# Cloud Assignment Submission Portal

A responsive web application for students to upload assignments and lecturers to manage submissions. The project is designed for AWS hosting with:

- Amazon S3 for static website hosting and private assignment storage
- Amazon API Gateway for HTTP endpoints
- AWS Lambda for Python backend processing
- Amazon DynamoDB for submission metadata
- AWS IAM permissions through SAM policies
- Amazon CloudWatch logs for Lambda monitoring

## Project Structure

```text
frontend/   Static HTML, CSS, and JavaScript web app
backend/    Python AWS Lambda function
docs/       Project documentation
template.yaml AWS SAM infrastructure template
```

## Run Locally

Open `frontend/index.html` in a browser. Without an API Gateway URL in `frontend/config.js`, the portal runs in demo mode using browser local storage.

## Configure the API

After deploying the AWS stack, copy the `ApiEndpoint` output into `frontend/config.js`:

```js
window.PORTAL_CONFIG = {
  apiBaseUrl: "https://your-api-id.execute-api.your-region.amazonaws.com"
};
```

## Deploy With AWS SAM

```bash
sam build
sam deploy --guided
aws s3 sync frontend/ s3://YOUR_FRONTEND_BUCKET_NAME
```

Use the `FrontendWebsiteUrl` stack output to open the hosted app.
