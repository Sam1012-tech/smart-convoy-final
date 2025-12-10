# Smart Convoy - Database Integration Changes

## Summary of Changes

The convoy system has been completely refactored to support:
1. **Multiple vehicles per convoy** - You can now add vehicles to existing convoys by convoy name
2. **PostgreSQL database** - All data is now persisted in a PostgreSQL database instead of in-memory storage
3. **Unique convoy names** - Convoys are identified by unique names
4. **Automatic vehicle addition** - When you create a convoy with the same name, vehicles are automatically added to the existing convoy

## Key Improvements

### Before
- Each vehicle created a new convoy (even with same convoy name)
- Data was stored in memory and lost on restart
- No persistence

### After
- One convoy can contain multiple vehicles
- All data persisted in PostgreSQL database
- Convoy name is unique - adding vehicles with same convoy name adds to existing convoy
- Vehicle registration numbers are unique across all convoys

## New Files Created

1. **[backend/core/database.py](backend/core/database.py)** - Database configuration and connection
2. **[backend/models/db_models.py](backend/models/db_models.py)** - SQLAlchemy database models
3. **[backend/alembic.ini](backend/alembic.ini)** - Alembic migration configuration
4. **[backend/alembic/env.py](backend/alembic/env.py)** - Alembic environment setup
5. **[backend/alembic/script.py.mako](backend/alembic/script.py.mako)** - Migration template
6. **[backend/.env.example](backend/.env.example)** - Environment variables example
7. **[backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md)** - Complete database setup guide

## Modified Files

1. **[backend/requirements.txt](backend/requirements.txt)** - Added PostgreSQL and SQLAlchemy dependencies
2. **[backend/routers/convoy_routes.py](backend/routers/convoy_routes.py)** - Completely refactored to use database
3. **[backend/main.py](backend/main.py)** - Added database initialization on startup

## How It Works Now

### Creating a Convoy with Vehicles

**First time (creates new convoy):**
```bash
POST /api/convoys/create
{
  "convoy_name": "Medical Supply Alpha",
  "source_lat": 28.6139,
  "source_lon": 77.2090,
  "destination_lat": 28.4595,
  "destination_lon": 77.0266,
  "priority": "high",
  "vehicles": [...]
}
```
Response: "Convoy 'Medical Supply Alpha' created successfully"

**Second time with same convoy name (adds vehicles to existing convoy):**
```bash
POST /api/convoys/create
{
  "convoy_name": "Medical Supply Alpha",  # Same name
  "vehicles": [...]  # Different vehicles
}
```
Response: "Added 2 vehicle(s) to existing convoy 'Medical Supply Alpha'"

### Adding Single Vehicle to Convoy

New endpoint to add one vehicle at a time:
```bash
POST /api/convoys/add-vehicle/Medical Supply Alpha
{
  "vehicle_type": "truck",
  "registration_number": "DL-01-AB-5678",
  ...
}
```

## Setup Instructions

### 1. Install PostgreSQL
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
```

### 2. Create Database
```bash
sudo -u postgres psql
```

```sql
CREATE USER convoy_user WITH PASSWORD 'convoy_pass';
CREATE DATABASE smart_convoy_db;
GRANT ALL PRIVILEGES ON DATABASE smart_convoy_db TO convoy_user;
\c smart_convoy_db
GRANT ALL ON SCHEMA public TO convoy_user;
\q
```

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run Migrations
```bash
cd backend
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 5. Start Application
```bash
cd backend
python main.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convoys/create` | Create convoy or add vehicles to existing |
| POST | `/api/convoys/add-vehicle/{convoy_name}` | Add single vehicle to convoy |
| GET | `/api/convoys/list` | List all convoys |
| GET | `/api/convoys/{convoy_id}` | Get convoy details |
| DELETE | `/api/convoys/{convoy_id}` | Delete convoy |

## Database Schema

### convoys Table
- `id` (Primary Key)
- `convoy_name` (Unique)
- `source_lat`, `source_lon`
- `destination_lat`, `destination_lon`
- `priority`
- `created_at`, `updated_at`

### vehicles Table
- `id` (Primary Key)
- `convoy_id` (Foreign Key → convoys.id)
- `vehicle_type`
- `registration_number` (Unique)
- `source_lat`, `source_lon`
- `destination_lat`, `destination_lon`
- `load_type`
- `load_weight_kg`
- `capacity_kg`
- `current_status`
- `driver_name`
- `created_at`, `updated_at`

**Relationship:** One convoy has many vehicles (one-to-many)

## Testing the Changes

### 1. Create first convoy
```bash
curl -X POST http://localhost:8000/api/convoys/create \
  -H "Content-Type: application/json" \
  -d '{
    "convoy_name": "Alpha",
    "source_lat": 28.6139,
    "source_lon": 77.2090,
    "destination_lat": 28.4595,
    "destination_lon": 77.0266,
    "priority": "high",
    "vehicles": [{
      "vehicle_type": "truck",
      "registration_number": "DL-01-AB-1234",
      "source_lat": 28.6139,
      "source_lon": 77.2090,
      "destination_lat": 28.4595,
      "destination_lon": 77.0266,
      "load_type": "medical",
      "load_weight_kg": 500,
      "capacity_kg": 1000,
      "driver_name": "Raj Kumar"
    }]
  }'
```

### 2. Add more vehicles to same convoy
```bash
curl -X POST http://localhost:8000/api/convoys/create \
  -H "Content-Type: application/json" \
  -d '{
    "convoy_name": "Alpha",
    "vehicles": [{
      "vehicle_type": "ambulance",
      "registration_number": "DL-01-AB-5678",
      "source_lat": 28.6139,
      "source_lon": 77.2090,
      "destination_lat": 28.4595,
      "destination_lon": 77.0266,
      "load_type": "medical",
      "load_weight_kg": 300,
      "capacity_kg": 800,
      "driver_name": "Amit Singh"
    }]
  }'
```

### 3. List all convoys
```bash
curl http://localhost:8000/api/convoys/list
```

You should see:
- 1 convoy named "Alpha"
- 2 vehicles in that convoy
- Total load: 800 kg

## Benefits

1. **Data Persistence** - All data survives application restarts
2. **Proper Relationships** - Vehicles properly linked to convoys
3. **Scalability** - PostgreSQL can handle large amounts of data
4. **Data Integrity** - Unique constraints prevent duplicate registrations
5. **Easy Management** - Add vehicles to existing convoys easily
6. **Timestamps** - Track when convoys and vehicles were created/updated

## Next Steps

For detailed setup instructions, see [DATABASE_SETUP.md](backend/DATABASE_SETUP.md)
