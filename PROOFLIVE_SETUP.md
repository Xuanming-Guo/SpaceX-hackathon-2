# Optional Prooflive setup

DrainOps itself is built for Vercel and does not require Prooflive to deploy.

Prooflive’s workflow supplies the account owner with a site-specific “Build with AI” prompt containing a private build link/API base. That link has not been provided for this project. To add the optional sponsor explanation/impact page, provide the generated prompt to the build operator and follow its exact instructions on the same machine/agent required by Prooflive.

Treat the generated link as a password: do not commit it, put it in application runtime variables, include it in Vercel environment variables, or paste it into public logs/screenshots. No universal `PROOFLIVE_API_KEY` or public endpoint has been assumed.
