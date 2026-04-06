London College Nansana Website

Setup
1. Copy .env.example to .env
2. Fill in your MySQL password and admin key
3. Run npm install
4. Run npm start
5. Open http://localhost:3001/index.html
6. Open http://localhost:3001/admin.html for content management

Notes
- The site auto-connects to port 3001 even if you open the frontend on Live Server.
- Uploads are saved in /uploads and content is stored in MySQL.
- Existing tables are auto-created and auto-migrated for missing columns.
