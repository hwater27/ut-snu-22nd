# 22nd UT–SNU Kendo Friendship Match – Members Site

A single-page static site that lists members with a table of contents (names) and paginated profile cards. Designed for hosting on Netlify.

## Features
- Top-of-page Table of Contents linking to each member’s card
- Paginated member cards (toggle through pages)
- Data is loaded from Google Sheets CSV, with a local text fallback
- No backend required; pure HTML/CSS/JS

## Data Source
- Google Sheet: https://docs.google.com/spreadsheets/d/1pMFnTJJiDN3AYKNAP3NEHNXnl2UXPLl5gdEIZR-SA3s/edit?usp=sharing
- The app attempts to fetch:
  1) `https://docs.google.com/spreadsheets/d/ID/export?format=csv`
  2) `https://docs.google.com/spreadsheets/d/ID/gviz/tq?tqx=out:csv`
  3) Fallback: `sample_excel_file.txt` (pipe-delimited example)

If your sheet is not publicly accessible, publish it or adjust permissions so “Anyone with the link” can view.

## Local Development
Open `index.html` directly in a browser, or serve the folder with any static server.

## Deploy to Netlify
1. Push this folder to a Git repository (GitHub, GitLab, Bitbucket).
2. In Netlify, create a New Site from Git and select the repository.
3. Build command: (empty), Publish directory: `.`

Netlify config is in `netlify.toml`.

# ut-snu-22nd
Introduce yourself! Site for the 22nd UT-SNU Kendo Friendship Match
