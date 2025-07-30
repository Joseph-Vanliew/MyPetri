# MyPetri Google Cloud Run Deployment Checklist
Use this check mark ✅ if doing for the first time!
## Prerequisites
- [ ] Install Google Cloud SDK (use brew or winget)
  ```bash
  # macOS
  brew install google-cloud-sdk
  
  # Windows
  winget install Google.CloudSDK
  ```
- [ ] Initialize Google Cloud SDK (`gcloud init`)
  ```bash
  gcloud init
  ```
- [ ] Authenticate (`gcloud auth login`) - must have an account
  ```bash
  gcloud auth login
  ```
- [ ] Create/select Google Cloud project
  ```bash
  # Create new project (if needed)
  gcloud projects create YOUR_PROJECT_ID --name="MyPetri Project"
  
  # Set existing project
  gcloud config set project YOUR_PROJECT_ID
  ```
- [ ] Enable required services (cloudbuild, run, artifactregistry)
  ```bash
  gcloud services enable cloudbuild.googleapis.com
  gcloud services enable run.googleapis.com
  gcloud services enable artifactregistry.googleapis.com
  ```

## Deployment Steps
- [ ] Create Artifact Registry repository
  ```bash
  export PROJECT_ID=$(gcloud config get-value project)
  export REGION=us-central1
  export REPO_NAME=mypetri-repo
  
  gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="MyPetri Docker repository"
  ```
- [ ] Build Docker image 
  ```bash
  gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/mypetri-app:v26
  ```
- [ ] Push image to Artifact Registry
  ```bash
  # This is done automatically with the build command above
  # If you need to push an existing image:
  docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/mypetri-app:v26
  ```
- [ ] Deploy to Cloud Run
  ```bash
  gcloud run deploy mypetri-app \
    --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/mypetri-app:v26 \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080
  ```
- [ ] Verify application is running
  ```bash
  gcloud run services describe mypetri-app --region=${REGION}
  ```

## Post-Deployment
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Set up custom domain
- [ ] Set up CI/CD pipeline

## Main Commands Once Set Up
```bash
# Set these for the build
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export REPO_NAME=pats-repo

#Build docker image and submit to artifact registry
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/pats-app:v27

#Deploy image to Cloud Run Instance
gcloud run deploy pats-app \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/pats-app:v27 \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated

# View logs
gcloud run logs tail --service pats-app
``` 
