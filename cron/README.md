# Absensi Cron Service

Standalone cron service untuk sistem absensi yang menjalankan tugas penjadwalan untuk menandai pekerja yang absen setiap hari.

## 🎯 Tujuan

Service ini dibuat terpisah dari server utama untuk:
- Menghindari penggunaan CPU penuh pada server utama
- Memberikan isolasi dan skalabilitas yang lebih baik
- Memungkinkan monitoring dan maintenance terpisah
- Meningkatkan reliabilitas sistem secara keseluruhan

## 📋 Fitur

- **Automated Scheduling**: Berjalan otomatis setiap hari jam 23:00 WIB
- **Manual Trigger**: Endpoint untuk menjalankan secara manual saat testing
- **Health Monitoring**: Health check dan status endpoints
- **Batch Processing**: Memproses data dalam batch untuk performa optimal
- **Detailed Logging**: Log dengan timestamp dan level severity
- **Graceful Shutdown**: Shutdown yang aman saat container dihentikan
- **Resource Limits**: Pembatasan penggunaan CPU dan memory

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy environment file
copy .env.example .env

# Edit .env dengan konfigurasi database Anda
notepad .env
```

### 2. Start Service

```bash
# Start dengan script
start-cron.bat

# Atau manual dengan docker-compose
docker-compose up --build -d
```

### 3. Monitor Service

```bash
# Gunakan monitoring tool
monitor-cron.bat

# Atau check status manual
curl http://localhost:3002/health
```

## 🔧 Konfigurasi

### Environment Variables (.env)

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=absensi_db
DB_PORT=3306

# Service Configuration
CRON_PORT=3002
NODE_ENV=production
TZ=Asia/Jakarta

# Optional: Database root password for MySQL container
DB_ROOT_PASSWORD=root_password
```

### Docker Resources

Service dikonfigurasi dengan resource limits:
- **Memory Limit**: 256MB
- **Memory Reservation**: 128MB
- **CPU Limit**: 0.25 core (25%)
- **CPU Reservation**: 0.1 core (10%)

## 📡 API Endpoints

### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "running",
  "service": "cron-scheduler",
  "timezone": "Asia/Jakarta",
  "schedule": "23:00 daily",
  "state": {
    "isRunning": false,
    "lastRun": "2025-01-26T16:00:00.000Z",
    "runCount": 5
  },
  "uptime": 3600,
  "memoryUsage": {...}
}
```

### Detailed Status
```http
GET /status
```

### Manual Trigger
```http
POST /trigger
```

### Logs
```http
GET /logs
```

## ⏰ Jadwal Cron

- **Schedule**: `0 23 * * *` (setiap hari jam 23:00)
- **Timezone**: Asia/Jakarta (WIB)
- **Function**: Menandai pekerja yang belum absen hari itu

## 🔍 Monitoring

### Health Checks

Docker container memiliki built-in health check:
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect absensi-cron-service | jq '.[0].State.Health'
```

### Log Monitoring

```bash
# Real-time logs
docker-compose logs -f cron-service

# Recent logs
docker-compose logs --tail=50 cron-service

# Search logs
docker-compose logs cron-service | findstr "ERROR"
```

### Resource Monitoring

```bash
# Container stats
docker stats absensi-cron-service

# Memory and CPU usage
docker-compose exec cron-service cat /proc/meminfo
docker-compose exec cron-service cat /proc/loadavg
```

## 🛠 Troubleshooting

### Service Won't Start

1. **Check .env file**:
   ```bash
   type .env
   ```

2. **Verify database connection**:
   ```bash
   # Test database connectivity
   curl http://localhost:3002/health
   ```

3. **Check container logs**:
   ```bash
   docker-compose logs cron-service
   ```

### High CPU Usage

Jika masih mengalami CPU tinggi:

1. **Adjust resource limits** di `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.1'  # Kurangi limit CPU
   ```

2. **Optimize cron schedule**:
   - Ubah jadwal ke waktu yang kurang sibuk
   - Split processing menjadi beberapa batch kecil

### Database Connection Issues

1. **Check database credentials** di `.env`
2. **Verify network connectivity**:
   ```bash
   docker-compose exec cron-service ping mysql
   ```
3. **Check MySQL logs**:
   ```bash
   docker-compose logs mysql
   ```

## 📊 Performance

### Batch Processing

Service menggunakan batch processing untuk menghindari overload:
- **Batch Size**: 50 workers per batch
- **Concurrent Processing**: Promise.all untuk parallel execution
- **Memory Efficient**: Streaming results untuk dataset besar

### Database Optimization

- Connection pooling untuk reuse koneksi
- Prepared statements untuk keamanan
- Indexed queries untuk performa optimal

## 🔄 Deployment

### Development

```bash
# Start development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production

```bash
# Production deployment
docker-compose up -d

# Scale if needed (multiple instances)
docker-compose up -d --scale cron-service=2
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Deploy Cron Service
  run: |
    docker-compose pull
    docker-compose up -d --no-deps cron-service
```

## 📝 Logging

### Log Levels

- **INFO**: Normal operations
- **ERROR**: Error conditions
- **DEBUG**: Detailed debugging (development only)

### Log Format

```
[2025-01-26T16:00:00.000Z] [INFO] Menjalankan tugas penjadwalan: Menandai pekerja absen...
[2025-01-26T16:00:01.234Z] [INFO] Ditemukan 150 pekerja aktif
[2025-01-26T16:00:02.456Z] [INFO] 142 pekerja sudah memiliki catatan kehadiran
[2025-01-26T16:00:03.789Z] [INFO] ✅ Berhasil menandai 8 pekerja absen.
```

## 🔐 Security

### Container Security

- Non-root user execution
- Read-only filesystem untuk static files
- No privileged access
- Network isolation

### Database Security

- Environment variables untuk credentials
- Connection pooling dengan timeout
- SQL injection prevention dengan prepared statements

## 📞 Support

Jika mengalami masalah:

1. **Check logs** terlebih dahulu
2. **Verify configuration** di `.env`
3. **Test manual trigger** untuk debugging
4. **Monitor resource usage** untuk performance issues

## 🗂 File Structure

```
cron/
├── cron-server.js          # Main cron service
├── package.json            # Dependencies
├── Dockerfile             # Container definition
├── docker-compose.yml     # Service orchestration
├── .dockerignore          # Build optimization
├── .env.example           # Environment template
├── start-cron.bat         # Startup script
├── monitor-cron.bat       # Monitoring tool
├── README.md              # Documentation
└── config/
    └── db.js              # Database connection
```
