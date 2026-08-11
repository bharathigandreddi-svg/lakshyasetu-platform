LAKSHYASETU DEPLOYMENT-READY MVP

Keep every file in the same folder.

Public:
index.html
login.html
signup.html

Admin:
admin.html

Student:
student.html

Configuration:
config.js
styles.css

The Supabase URL and publishable key are included. Never add a Supabase secret/service-role key.

IMPORTANT:
Opening HTML files directly with file:// may cause browser/CORS/module issues. Deploy the folder to a web host or run it through a local web server.

After deployment, set the final website URL in Supabase Authentication URL Configuration and add the same URL to allowed redirect URLs if needed.

Current features:
- Supabase Auth login/signup
- Admin role verification
- Course reading
- Admin lesson creation
- Student lesson viewing
- Video/PDF URL fields

Next build:
- Supabase Storage upload for videos/PDFs
- MCQ/test system
- Student progress
- Membership/payment system
- Final domain
