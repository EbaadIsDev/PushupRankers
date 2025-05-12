# Netlify Build Instructions

When deploying to Netlify, the build command will be:

```
npm run build
```

This will build the frontend client code to the `dist` directory, which Netlify will serve as static content.

The serverless functions in the `netlify/functions` directory will be automatically deployed by Netlify.

## Environment Variables

You'll need to set these environment variables in your Netlify deployment:

- `DATABASE_URL` - The URL to your PostgreSQL database (if using one)
- `SESSION_SECRET` - A secret for session management