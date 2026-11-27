# Firebase + GitHub Actions setup without a service-account JSON key

The repository targets Firebase project medifindbd. The companion workflow deploys only Firestore Rules, Firestore composite indexes and Cloud Storage Rules. It does not deploy app code, write application records, seed demo data, or change Vercel.

## Security model

- GitHub Actions obtains short-lived Google credentials using GitHub OIDC / Workload Identity Federation (WIF).
- No service-account private key, FIREBASE_TOKEN, or JSON key is stored in GitHub.
- The workflow is manual-only and runs only from main.
- Configure the GitHub environment firebase-production with a required reviewer.
- Firestore and Storage rules deliberately deny all browser/client reads and writes. Keep this posture unless a separately reviewed client access design is approved.

## One-time Google Cloud setup

Do this while signed in as an Owner or an administrator with IAM permission management on project medifindbd. You can use Google Cloud Shell in a mobile browser; no local computer is required.

1. Open https://console.cloud.google.com/?project=medifindbd and start Cloud Shell.
2. Run the commands below. They create a dedicated deployer service account, a GitHub-only identity pool/provider, and grant Firebase Rules Admin plus Firestore Index Admin. These roles allow publishing rules and indexes; they do not grant application data access.

~~~bash
PROJECT_ID="medifindbd"
REPO="psfaruk/medbriq"
SA_NAME="github-firebase-deployer"
POOL_ID="github-medbriq"
PROVIDER_ID="github-medbriq"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebase.googleapis.com firebaserules.googleapis.com \
  firestore.googleapis.com storage.googleapis.com \
  --project="$PROJECT_ID"

gcloud iam service-accounts create "$SA_NAME" \
  --project="$PROJECT_ID" \
  --display-name="GitHub Firebase rules deployer"

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" --location="global" \
  --display-name="GitHub Medbriq deployment pool"

POOL_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub Medbriq main branch" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/$REPO"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/firebaserules.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.indexAdmin"

PROVIDER_RESOURCE="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location="global" \
  --workload-identity-pool="$POOL_ID" --format='value(name)')"

echo "GCP_WORKLOAD_IDENTITY_PROVIDER=$PROVIDER_RESOURCE"
echo "GCP_FIREBASE_DEPLOYER_SERVICE_ACCOUNT=$SA_EMAIL"
~~~

Wait several minutes for IAM changes to propagate. These commands do not create or export a service-account key.

## One-time GitHub setup

1. In GitHub, open psfaruk/medbriq → Settings → Environments.
2. Create an environment named exactly firebase-production.
3. Enable Required reviewers and select yourself or an authorized maintainer. Restrict deployment branches to main.
4. Open Settings → Secrets and variables → Actions → Variables.
5. Add these two repository variables using the exact Cloud Shell output:
   - GCP_WORKLOAD_IDENTITY_PROVIDER = full provider resource name
   - GCP_FIREBASE_DEPLOYER_SERVICE_ACCOUNT = service-account email
6. Copy docs/workflows/firebase-deploy-wif.yml to .github/workflows/firebase-deploy-wif.yml on the repository's default branch. GitHub Actions only discovers workflow files inside .github/workflows/.

## Run a deployment

After the workflow file is on main:

1. GitHub → Actions → Firebase rules and indexes (WIF).
2. Choose Run workflow on main.
3. Approve the firebase-production environment deployment when prompted.
4. Confirm the workflow succeeds and targets medifindbd.

The workflow is manual and approval-gated. It does not run automatically on push, and it does not touch Firestore documents or seed data.

## Important limitations

- This is a GitHub-to-Firebase deployment workflow, not a ChatGPT Firebase connector. It does not give ChatGPT direct access to the Firebase Console or database.
- To inspect or edit Firestore documents, use the Firebase Console or a separately authorized server-side tool. Never put service-account JSON, private keys, passwords, or Firebase refresh tokens in chat.
- Current project rules intentionally deny all client-side Firestore and Storage access. Do not loosen them just to make the web client connect.
- Production SMS, Google Sign-In, push configuration, data residency, backups, and existing production preflight remain separate release requirements.
