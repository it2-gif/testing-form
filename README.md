# EACC Placement Test

A static placement-test form for the Egyptian American Center. GitHub Pages hosts the frontend, and Google Apps Script validates submissions and routes them to the correct Google Sheet tab.

## Project structure

```text
.
|-- index.html                 # Semantic page markup
|-- assets/
|   |-- css/styles.css         # Screen, responsive, and PDF styles
|   |-- images/eacc-logo.jpg   # EACC logo
|   `-- js/
|       |-- config.js          # Routes, camps, levels, and Apps Script URL
|       `-- app.js             # Form, camera, validation, PDF, and submission behavior
`-- apps-script/Code.gs        # Google Apps Script backend
```

## Common updates

Edit `assets/js/config.js` when changing camps, levels, language routes, or the deployed Apps Script URL. Edit `apps-script/Code.gs` when changing spreadsheet routing or server-side validation.

## Frontend deployment

GitHub Pages publishes the `main` branch from the repository root. Pushing a commit to `main` automatically updates:

`https://it2-gif.github.io/testing-form/`

## Apps Script deployment

1. Copy the full contents of `apps-script/Code.gs` into the Apps Script project's `Code.gs` file.
2. Save the project.
3. Open **Deploy > Manage deployments**.
4. Edit the web app deployment, choose **New version**, and deploy.
5. Keep **Execute as** set to the owner and access set to the audience required by the form.

Opening the `/exec` URL directly produces a missing-fields message. Test submissions through the hosted form.
## Local verification

With Node.js installed, run `npm install` once and then `npm test` while the project is available at `http://127.0.0.1:4173/`. The smoke test checks asset loading, programme routing, level ordering, and mobile overflow without submitting the form.
