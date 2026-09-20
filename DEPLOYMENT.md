# MedRoute Deployment Guide

Follow these steps exactly to deploy the MedRoute application to the cloud.

## STEP 1
Create GitHub repository and push this code.

## STEP 2
Configure local environment variables by copying .env.example to .env in the root directory.

## STEP 3
Run application locally to ensure dependencies are installed. (e.g. 
pm install in frontend).

## STEP 4
Run Docker Compose:
docker-compose up --build -d

## STEP 5
Verify full local stack:
- Backend: http://localhost:8080/actuator/health
- ML Service: http://localhost:5000/health

## STEP 6
Create Supabase project (https://supabase.com).

## STEP 7
Configure PostgreSQL. Obtain the connection string (JDBC URL) and password from Supabase dashboard.

## STEP 8
Run database migrations. Connect to Supabase DB using a tool like DBeaver or psql, and execute the SQL found in ackend-java/src/main/resources/db/migration/V1__initial_schema.sql.

## STEP 9
Verify database tables are created in Supabase.

## STEP 10
Deploy Python ML service to Render:
- Connect Render to GitHub.
- Create a new "Web Service".
- Select the repository.
- Root Directory: ackend-ml
- Environment: Docker
- Instance type: Free (512 MB).

## STEP 11
Test ML API: Send a POST request to your Render ML URL to ensure it responds.

## STEP 12
Deploy Spring Boot to Render:
- Create a new "Web Service".
- Select the repository.
- Root Directory: ackend-java
- Environment: Docker
- Instance type: Free (512 MB).

## STEP 13
Connect Spring Boot to Supabase. Add to Render Environment Variables:
- SPRING_DATASOURCE_URL: (Supabase JDBC URL)
- SPRING_DATASOURCE_USERNAME: postgres
- SPRING_DATASOURCE_PASSWORD: (Supabase password)

## STEP 14
Connect Spring Boot to ML service. Add to Render Environment Variables:
- ML_API_URL: (Your ML Render URL)

## STEP 15
Test complete backend: Wait for deployment and hit /actuator/health.

## STEP 16
Deploy React to Vercel:
- Connect Vercel to GitHub.
- Root Directory: rontend
- Framework: Vite

## STEP 17
Configure frontend API URL in Vercel settings:
- Add VITE_API_URL pointing to your Render Java backend URL.

## STEP 18
Test frontend -> backend connection by loading the Vercel app.

## STEP 19
Configure Cloudflare DNS (Optional but recommended). Point your domain to Vercel.

## STEP 20
Configure custom domains if available in Vercel / Render.

## STEP 21
Configure production CORS in Render Java Backend:
- Add CORS_ALLOWED_ORIGINS = https://your-vercel-domain.com

## STEP 22
Run complete end-to-end test on the production domain.

## STEP 23
Check logs on Render and Vercel.

## STEP 24
Check health endpoints publicly.

## STEP 25
Check database rows in Supabase to ensure users are created.

## STEP 26
Check ML inference by performing an AI Tradeoff search.

## STEP 27
Document rollback procedure: Roll back in Vercel/Render dashboard by deploying a previous commit.

