# Setup Guide

## Local Development

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chat-guessing-game.git
   cd chat-guessing-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Admin: http://localhost:3000/admin.html
   - Players: http://localhost:3000

## Production Deployment

### Option 1: VPS Deployment

1. **Setup your VPS**
   - Ensure Node.js is installed
   - Clone the repository to your server

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "guessing-game"
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx (optional)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Using Cloudflare Tunnels

1. **Install cloudflared**
   ```bash
   # See: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
   ```

2. **Start your server**
   ```bash
   npm start
   ```

3. **Create tunnel**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

### Environment Variables

You can set the port via environment variable:

```bash
PORT=8080 npm start
```

## Configuration

### Updating WebSocket URLs for Production

In both `admin.html` and `index.html`, update the WebSocket connection:

```javascript
// Change from:
const ws = new WebSocket('ws://localhost:3000');

// To your production URL:
const ws = new WebSocket('wss://yourdomain.com');
```

### HTTPS/WSS Support

For secure WebSocket connections (wss://), you'll need:
- SSL certificate (Let's Encrypt recommended)
- Proxy server (Nginx/Apache) or
- Node.js HTTPS server configuration

## Troubleshooting

### WebSocket Connection Issues

If players can't connect:
1. Check firewall rules (port 3000 or your custom port)
2. Verify WebSocket URL in HTML files matches your server
3. Ensure no proxy is blocking WebSocket connections

### Admin Panel Not Working

1. Clear browser cache
2. Check browser console for errors
3. Verify WebSocket connection is established

## Security Recommendations

For production environments, consider:

1. **Admin Authentication**
   - Add password protection for admin panel
   - Use environment variables for credentials

2. **Rate Limiting**
   - Implement WebSocket message rate limits
   - Prevent spam/abuse

3. **HTTPS/WSS**
   - Always use secure connections in production
   - Get free SSL certificates from Let's Encrypt

4. **CORS Configuration**
   - Restrict origins if needed
   - Configure Express CORS middleware

## Performance Tips

- Use PM2 or similar process manager
- Monitor memory usage for long-running games
- Consider Redis for multi-server deployments
- Implement connection pooling for high traffic

## Support

For issues or questions, open an issue on GitHub.
