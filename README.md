# Cloud Assignment Submission Portal

A simple cloud-based web application that enables students to submit assignments online while allowing lecturers to securely manage and download submissions.

This project was developed as part of the **Cloud Build With Peers – Cohort 1** organized by **Akwannya Hub**.

---

## Problem

Many schools still rely on WhatsApp, email, or flash drives for assignment submission. These methods make it difficult to organize, secure, and retrieve student submissions.

---

## Solution

The Cloud Assignment Submission Portal provides a centralized platform where students can upload assignments securely and lecturers can manage submissions from anywhere.

---

## Features

- Student assignment upload
- Secure cloud storage
- Assignment metadata storage
- Lecturer dashboard
- Download submitted assignments
- Responsive web interface

---

## Technologies

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Python (Flask or AWS Lambda)

### Cloud Services

- Amazon S3
- Amazon DynamoDB
- Amazon API Gateway
- AWS Lambda
- AWS IAM
- Amazon CloudWatch

---

## Architecture

Student

↓

Frontend (S3 Static Website)

↓

API Gateway

↓

AWS Lambda

↓

Amazon S3 + DynamoDB

---

## Project Structure

frontend/

backend/

docs/

screenshots/

README.md

---

## Installation

Clone the repository

git clone https://github.com/yourusername/cloud-assignment-submission-portal.git

Navigate into the project

cd cloud-assignment-submission-portal

Install dependencies

pip install -r requirements.txt

Run locally

python app.py

---

## Future Improvements

- User authentication
- Lecturer login
- Email notifications
- Assignment deadlines
- File versioning
- Analytics dashboard

---

## Author

Joshua Osafo

Cybersecurity Analyst | Cloud Computing Enthusiast

LinkedIn:
https://linkedin.com/in/joshua-osafo-8b7101287
