# Setting Up Nginx with HTTPS for an Express App on Server

This guide provides step-by-step instructions for converting an HTTP Express app hosted on your server to HTTPS using Certbot and Nginx. 

### Prerequisites
- A registered domain name (configured on Namecheap in this example).
- An Express app running on your server.

---

## 1. Point Your Domain to Server

1. **Create an A Record** on DNS:
   - Set the **Host** to `@`.
   - Set the **Value** to your server’s IP address (e.g., `134.209.64.92`).
2. **Add a `www` Subdomain**:
   - Add another A Record with the **Host** as `www` and the **Value** as your server’s IP address.

This allows you to access both `mydomain.com` and `www.mydomain.com`.

---

## 2. Install Certbot and Nginx

1. Update your package list:
   ```bash
   sudo apt update
   ```
2. Install Certbot and Nginx:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```

---

## 3. Configure Nginx as a Reverse Proxy for Your Express App

To forward HTTPS traffic to your Express app, configure Nginx to act as a reverse proxy.

1. **Create a New Nginx Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/mydomain.com
   ```

2. **Add the Configuration** (replace `mydomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name mydomain.com www.mydomain.com;

       location / {
           proxy_pass http://localhost:3000; # Port where your Express app is running
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable the Site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mydomain.com /etc/nginx/sites-enabled/
   ```

4. **Check Configuration**:
   Test for syntax errors:
   ```bash
   sudo nginx -t
   ```
5. **Restart Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

---

## 4. Obtain SSL Certificates with Certbot

1. Run Certbot to obtain and configure an SSL certificate:
   ```bash
   sudo certbot --nginx -d mydomain.com -d www.mydomain.com
   ```

   Certbot will automatically modify your Nginx configuration to:
   - Listen on port **443** for HTTPS traffic.
   - Redirect HTTP (port 80) traffic to HTTPS.

---

## 5. Finalize Nginx Configuration

Check the Nginx configuration to ensure it’s set up to handle HTTPS traffic properly.

1. Open `/etc/nginx/sites-available/mydomain.com` and verify it looks like this:
   ```nginx
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name mydomain.com www.mydomain.com;

       return 301 https://$host$request_uri;
   }

   # Handle HTTPS traffic
   server {
       listen 443 ssl;
       server_name mydomain.com www.mydomain.com;

       ssl_certificate /etc/letsencrypt/live/mydomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mydomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

2. Test and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 6. Configure Express for HTTPS (Optional)

In your Express app, trust Nginx as the proxy by adding this line:
```javascript
app.set('trust proxy', 1);
```

---

## 7. Auto-Renew SSL Certificates

Certbot should automatically set up a cron job to renew certificates. Confirm it with:
```bash
sudo systemctl status certbot.timer
```

---

Your Express app is now accessible via HTTPS!

## NOTE:

If there’s a default configuration (often named default or 000-default) in /etc/nginx/sites-enabled, it could interfere. Try disabling it:

```bash
sudo rm /etc/nginx/sites-enabled/default
```
Then reload NGINX:

```bash
sudo systemctl reload nginx
```

You may want to redirect www.your_domain.com traffic to your_domain.com, for CORS issues:
```Nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name www.your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    # Redirect HTTPS traffic
    return 301 https://your_domain.com$request_uri;
}

server {
    listen 443 ssl;
    server_name your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;


    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
