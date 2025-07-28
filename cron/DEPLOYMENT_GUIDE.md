# 🚀 Deployment Guide - Absensi Cron Service

Panduan lengkap untuk deployment cron service yang terpisah dari server utama.

## 📋 Prerequisites

1. **Docker & Docker Compose** terinstall
2. **Database MySQL** sudah berjalan (bisa existing atau container baru)
3. **Network connectivity** ke database
4. **Port 3002** tersedia (atau sesuaikan di .env)

## 🔧 Setup Step-by-Step

### 1. Persiapan Environment

```bash
# Copy template environment
copy .env.example .env

# Edit dengan konfigurasi Anda
notepad .env
```

**Contoh konfigurasi .env:**
```env
# Database (update dengan kredensial Anda)
DB_HOST=your-db-host
DB_USER=your-db-user  
DB_PASSWORD=your-secure-password
DB_NAME=absensi_db
DB_PORT=3306

# Service
CRON_PORT=3002
NODE_ENV=production
TZ=Asia/Jakarta
```

### 2. Deployment Options

#### Option A: Standalone Cron Service Only

Jika Anda sudah punya database existing:

```bash
# Start cron service saja
docker-compose up -d cron-service

# Monitor logs
docker-compose logs -f cron-service
```

#### Option B: Complete Stack with MySQL

Jika Anda ingin MySQL container juga:

```bash
# Start semua services
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Verifikasi Deployment

```bash
# Test health endpoint
curl http://localhost:3002/health

# Check status detail
curl http://localhost:3002/status

# Manual trigger test
curl -X POST http://localhost:3002/trigger
```

## 🔍 Monitoring & Maintenance

### Real-time Monitoring

```bash
# Gunakan built-in monitor
monitor-cron.bat

# Atau manual
docker-compose logs -f cron-service
docker stats absensi-cron-service
```

### Health Checks

Service memiliki built-in health check:
- **Endpoint**: `/health`
- **Interval**: 30 detik
- **Timeout**: 10 detik
- **Retries**: 3 kali

### Performance Monitoring

```bash
# Resource usage
docker stats --no-stream absensi-cron-service

# Memory analysis
docker-compose exec cron-service cat /proc/meminfo

# Check scheduled jobs
curl http://localhost:3002/logs
```

## 🐛 Troubleshooting

### 1. Database Connection Issues

**Problem**: `Access denied for user`
```bash
# Solusi:
# 1. Verify credentials di .env
# 2. Test koneksi manual
mysql -h DB_HOST -u DB_USER -p DB_NAME

# 3. Check network (jika menggunakan container)
docker-compose exec cron-service ping mysql
```

**Problem**: `Connection timeout`
```bash
# Solusi:
# 1. Check database status
docker-compose logs mysql

# 2. Verify port accessibility
telnet DB_HOST DB_PORT

# 3. Check firewall rules
```

### 2. Service Won't Start

**Problem**: `Port already in use`
```bash
# Solusi:
# 1. Change port di .env
CRON_PORT=3003

# 2. Atau kill existing process
netstat -ano | findstr :3002
taskkill /PID <process_id> /F
```

**Problem**: `Module not found`
```bash
# Solusi:
# 1. Rebuild container
docker-compose build --no-cache cron-service

# 2. Check Dockerfile
docker-compose logs cron-service
```

### 3. High CPU Usage

Jika cron service masih menyebabkan CPU tinggi:

```bash
# 1. Adjust resource limits
# Edit docker-compose.yml:
deploy:
  resources:
    limits:
      cpus: '0.1'    # Kurangi dari 0.25
      memory: 128M   # Kurangi dari 256M
```

```bash
# 2. Optimize batch size
# Edit cron-server.js:
const batchSize = 25;  // Kurangi dari 50
```

```bash
# 3. Adjust cron schedule
# Edit cron-server.js untuk menjalankan di jam yang berbeda:
cron.schedule('0 22 * * *', ...);  // Jam 22:00 instead of 23:00
```

### 4. Memory Issues

```bash
# Monitor memory usage
docker stats absensi-cron-service

# Check for memory leaks
docker-compose exec cron-service cat /proc/meminfo

# Restart service jika perlu
docker-compose restart cron-service
```

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# Jangan commit .env ke repository
echo ".env" >> .gitignore

# Use strong passwords
DB_PASSWORD=your-very-secure-password-here
```

### 2. Network Security

```bash
# Restrict database access
# Di MySQL configuration:
bind-address = 127.0.0.1  # Only localhost

# Use firewall rules
# Allow only necessary ports
```

### 3. Container Security

```bash
# Run as non-root user (sudah dikonfigurasi)
# Read-only filesystem untuk static files
# No privileged access
```

## 📊 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes untuk performance
CREATE INDEX idx_catatan_kehadiran_date ON catatan_kehadiran(DATE(waktu_clock_in));
CREATE INDEX idx_catatan_kehadiran_pekerja ON catatan_kehadiran(id_pekerja);
CREATE INDEX idx_pengguna_status ON pengguna(status_pengguna);
```

### 2. Connection Pooling

Service sudah dikonfigurasi dengan:
- **Connection Limit**: 10
- **Wait for Connections**: true
- **Queue Limit**: 0 (unlimited)

### 3. Batch Processing

Processing dilakukan dalam batch untuk menghindari overload:
- **Batch Size**: 50 records
- **Concurrent Processing**: Promise.all
- **Memory Efficient**: Stream processing

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Cron Service

on:
  push:
    branches: [main]
    paths: ['cron/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker
        uses: docker/setup-buildx-action@v2
        
      - name: Deploy Cron Service
        run: |
          cd cron
          docker-compose pull
          docker-compose up -d --no-deps cron-service
          
      - name: Health Check
        run: |
          sleep 30
          curl -f http://localhost:3002/health
```

### Docker Registry Deployment

```bash
# Build dan push ke registry
docker build -t your-registry/absensi-cron:latest .
docker push your-registry/absensi-cron:latest

# Deploy di production server
docker pull your-registry/absensi-cron:latest
docker-compose up -d cron-service
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Multiple instances (jika diperlukan)
docker-compose up -d --scale cron-service=2

# Load balancer configuration
# Use nginx atau traefik untuk distribute health checks
```

### Vertical Scaling

```yaml
# Increase resources di docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'     # Increase CPU
      memory: 512M    # Increase memory
```

## 📞 Support & Maintenance

### Regular Maintenance

```bash
# Weekly cleanup
docker system prune -f

# Log rotation
docker-compose exec cron-service logrotate /etc/logrotate.conf

# Update dependencies
docker-compose build --no-cache cron-service
```

### Backup Strategy

```bash
# Backup configuration
tar -czf cron-backup-$(date +%Y%m%d).tar.gz .env docker-compose.yml

# Database backup (jika menggunakan MySQL container)
docker-compose exec mysql mysqldump -u root -p absensi_db > backup.sql
```

### Update Process

```bash
# 1. Backup current configuration
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup

# 2. Pull latest changes
git pull origin main

# 3. Update containers
docker-compose pull
docker-compose up -d --no-deps cron-service

# 4. Verify deployment
curl http://localhost:3002/health
```

## 🎯 Success Metrics

Service berhasil jika:
- ✅ Health check returns `200 OK`
- ✅ Logs menunjukkan koneksi database berhasil
- ✅ Cron job berjalan sesuai jadwal (23:00 WIB)
- ✅ CPU usage < 25% dari limit
- ✅ Memory usage < 80% dari limit
- ✅ No error logs dalam 24 jam terakhir

---

## 📝 Quick Commands Reference

```bash
# Start service
start-cron.bat

# Monitor
monitor-cron.bat

# Check health
curl http://localhost:3002/health

# Manual trigger
curl -X POST http://localhost:3002/trigger

# View logs
docker-compose logs -f cron-service

# Stop service
docker-compose down

# Restart
docker-compose restart cron-service
```
