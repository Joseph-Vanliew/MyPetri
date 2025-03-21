# PATS Google Cloud Run Deployment Checklist

## Prerequisites
- [ ] Install Google Cloud SDK
- [ ] Initialize Google Cloud SDK (`gcloud init`)
- [ ] Authenticate (`gcloud auth login`)
- [ ] Create/select Google Cloud project
- [ ] Enable required services (cloudbuild, run, artifactregistry)

## Deployment Steps
- [ ] Create Artifact Registry repository
- [ ] Build Docker image 
- [ ] Push image to Artifact Registry
- [ ] Deploy to Cloud Run
- [ ] Verify application is running

## Post-Deployment
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Set up custom domain (optional)
- [ ] Set up CI/CD pipeline (optional)

## Common Commands
```bash
# Build and push
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export REPO_NAME=pats-repo

gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/pats-app:v1

# Deploy we are on v5 at the moment so a new version would be v6
gcloud run deploy pats-app \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/pats-app:v5 \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated

# View logs
gcloud run logs tail --service pats-app
``` 