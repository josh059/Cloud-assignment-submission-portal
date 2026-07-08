# System Architecture

## Components

Frontend
- HTML
- CSS
- JavaScript

Backend
- AWS Lambda

Storage
- Amazon S3

Database
- Amazon DynamoDB

API
- Amazon API Gateway

Monitoring
- CloudWatch

Permissions
- IAM


                                Cloud Assignment Submission Portal
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 Student/User                                │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
                  ┌──────────────────────────────┐
                  │  Static Website (Amazon S3)  │
                  │  HTML • CSS • JavaScript     │
                  └──────────────┬───────────────┘
                                 │
                                 │ API Request
                                 ▼
                  ┌──────────────────────────────┐
                  │      Amazon API Gateway      │
                  │        HTTP API              │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │      AWS Lambda Function      │
                  │   uploadAssignment (Python)   │
                  └───────┬───────────────┬────────┘
                          │               │
                          │               │
              Store File  │               │ Store Metadata
                          ▼               ▼
            ┌────────────────────┐   ┌──────────────────────┐
            │     Amazon S3      │   │   Amazon DynamoDB    │
            │ Assignment Storage │   │ Submission Records   │
            └────────────────────┘   └──────────────────────┘
                          │
                          │
                          ▼
                 ┌──────────────────────┐
                 │ Amazon CloudWatch    │
                 │ Logs & Monitoring    │
                 └──────────────────────┘