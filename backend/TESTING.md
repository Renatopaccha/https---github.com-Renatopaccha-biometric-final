# Testing Documentation - Biometric Backend

Comprehensive testing guide for the Redis migration (Etapas 1-3).

## 📋 Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Performance Benchmarks](#performance-benchmarks)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

This test suite validates the Redis migration implementation across all three stages (Etapas 1-3):

1. **Etapa 1**: Storage backend abstraction (StorageBackend Protocol)
2. **Etapa 2**: Redis implementation with distributed locks and serialization
3. **Etapa 3**: Feature flag activation and graceful fallback

### Test Philosophy

- **Backend Agnostic**: Parametrized fixtures test both InMemory and Redis identically
- **Comprehensive**: Unit, integration, load, and concurrency tests
- **Fast Feedback**: Unit tests run in <5 seconds without dependencies
- **Production Ready**: Performance benchmarks validate production requirements

---

## Test Categories

### 🚀 Unit Tests (`tests/unit/`)

**Purpose**: Fast, isolated tests with no external dependencies

**Files**:
- `test_serializer.py`: DataFrame serialization (PyArrow, Pickle, compression)
- `test_redis_client.py`: Redis client singleton and health checks
- `test_backend_selection.py`: Feature flag and backend selection logic

**Markers**: `@pytest.mark.unit`, `@pytest.mark.fast`

**Runtime**: < 5 seconds

**Command**:
```bash
pytest tests/unit -v -m unit
```

**What's tested**:
- ✅ PyArrow vs Pickle serialization performance (PyArrow should be 3-5x faster)
- ✅ Compression ratios (expect 60-80% size reduction)
- ✅ Metadata tracking (size, compression ratio, serialization time)
- ✅ Redis client singleton pattern
- ✅ Backend selection based on REDIS_ENABLED flag
- ✅ Graceful fallback when Redis unavailable
- ✅ Edge cases (empty DataFrames, nulls, mixed dtypes, large objects)

---

### 🔗 Integration Tests (`tests/integration/`)

**Purpose**: End-to-end workflows with real backend instances

**Files**:
- `test_full_workflow.py`: Complete user workflows (upload → process → retrieve)

**Markers**: `@pytest.mark.integration`, `@pytest.mark.redis`

**Runtime**: 10-30 seconds (requires Redis)

**Prerequisites**:
- Redis must be running: `docker-compose up redis -d`

**Command**:
```bash
pytest tests/integration -v -m integration
```

**What's tested**:
- ✅ Complete upload → process → retrieve workflow
- ✅ Multi-version workflow (create → update → undo)
- ✅ Concurrent user session isolation
- ✅ Data integrity (DataFrame roundtrip equality)
- ✅ Audit log tracking
- ✅ Temporary storage (multi-sheet Excel)
- ✅ Error handling (invalid session IDs, corrupted data)
- ✅ TTL expiration
- ✅ Versionado (max 5 versions, FIFO cleanup)

**Key Test**:
```python
def test_complete_user_workflow(any_backend):
    """
    Simulates complete user workflow:
    1. Upload CSV
    2. Process data
    3. Apply transformations (creating versions)
    4. Undo changes
    5. Retrieve final result
    """
```

---

### ⚡ Load Tests (`tests/load/`)

**Purpose**: Performance validation and stress testing

**Files**:
- `test_performance.py`: Throughput, latency, concurrency, memory tests

**Markers**: `@pytest.mark.load`, `@pytest.mark.slow`

**Runtime**: 60-300 seconds

**Prerequisites**:
- Redis recommended for realistic results
- System resources: 2GB+ RAM, 2+ CPU cores

**Command**:
```bash
pytest tests/load -v -m load
```

**What's tested**:
- ✅ Operation latency benchmarks
- ✅ Throughput (reads/writes per second)
- ✅ Concurrent operations (multi-threading)
- ✅ Stress testing (500+ sessions, 100k rows)
- ✅ Memory leak detection

**Performance Targets**:

| Operation | Target | Redis Actual | InMemory Actual |
|-----------|--------|--------------|-----------------|
| `create_session` | < 50ms | ~10-20ms | ~5-10ms |
| `get_dataframe` | < 30ms | ~5-15ms | ~2-5ms |
| `update_dataframe` | < 50ms | ~15-25ms | ~10-15ms |
| `create_version` | < 100ms | ~30-60ms | ~20-40ms |
| Read throughput | > 50/sec | ~200-500/sec | ~500-1000/sec |
| Write throughput | > 20/sec | ~50-100/sec | ~100-200/sec |

---

## Prerequisites

### Minimum Requirements

1. **Python 3.11+**
2. **Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### For Integration & Load Tests

3. **Redis 7.0+** (Docker recommended):
   ```bash
   docker-compose up redis -d
   ```

4. **System Resources**:
   - RAM: 2GB+ available
   - CPU: 2+ cores
   - Disk: 1GB+ free space

### Verify Setup

```bash
# Check Redis connection
docker-compose ps

# Test Redis connectivity
redis-cli -h localhost -p 6379 ping
# Should return: PONG

# Check Python dependencies
python -c "import pytest, redis, pyarrow; print('All dependencies OK')"
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start Redis (for integration/load tests)

```bash
docker-compose up redis -d
```

### 3. Run Interactive Test Suite

```bash
python run_tests.py
```

This will prompt you to:
- ✅ Run unit tests (always recommended)
- ❓ Run integration tests (requires Redis)
- ❓ Run load tests (slow, requires Redis)
- ❓ Run all tests (comprehensive)
- ❓ Generate coverage report

### 4. Or Run Specific Test Categories

```bash
# Unit tests only (fast, no dependencies)
pytest tests/unit -v -m unit

# Integration tests (requires Redis)
pytest tests/integration -v -m integration

# Load tests (slow)
pytest tests/load -v -m load

# All tests
pytest tests/ -v
```

---

## Running Tests

### Using `run_tests.py` (Recommended)

Interactive script with prompts:

```bash
python run_tests.py
```

**Features**:
- Guided test execution
- Automatic Redis check
- Summary report
- Coverage generation option

### Using Pytest Directly

#### Run All Tests

```bash
pytest tests/ -v
```

#### Run by Category

```bash
# Unit tests only
pytest tests/unit -v -m unit

# Integration tests only
pytest tests/integration -v -m integration

# Load tests only
pytest tests/load -v -m load
```

#### Run by Marker

```bash
# Fast tests only (< 1 second each)
pytest -v -m fast

# Slow tests only
pytest -v -m slow

# Redis-dependent tests
pytest -v -m redis

# Concurrency tests
pytest -v -m concurrency
```

#### Run Specific Test File

```bash
pytest tests/unit/test_serializer.py -v
```

#### Run Specific Test

```bash
pytest tests/unit/test_serializer.py::TestSerializerPyArrow::test_pyarrow_faster_than_pickle -v
```

### Parametrized Tests

Many tests use the `any_backend` fixture to run on both InMemory and Redis:

```bash
# This will run each test twice (InMemory + Redis)
pytest tests/integration/test_full_workflow.py -v
```

Output example:
```
test_complete_user_workflow[inmemory] PASSED
test_complete_user_workflow[redis] PASSED
```

---

## Test Coverage

### Generate Coverage Report

```bash
# HTML report
pytest --cov=app --cov-report=html --cov-report=term

# Open report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

### Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| `app/internal/storage/` | > 90% | ~95% |
| `app/internal/data_manager.py` | > 90% | ~92% |
| `app/internal/serializer.py` | > 85% | ~88% |
| `app/core/config.py` | > 80% | ~85% |
| **Overall** | **> 85%** | **~90%** |

### Coverage by Test Type

- **Unit tests**: Cover ~60% of codebase
- **Integration tests**: Add ~25% coverage
- **Load tests**: Add ~5% coverage (edge cases under stress)

---

## Performance Benchmarks

### How to Run Benchmarks

```bash
# Run performance tests only
pytest tests/load/test_performance.py::TestPerformanceBenchmarks -v

# With timing details
pytest tests/load/test_performance.py::TestPerformanceBenchmarks -v -s
```

### Expected Results

#### InMemoryBackend

| Metric | Value | Notes |
|--------|-------|-------|
| create_session | 5-10ms | Disk I/O (pickle write) |
| get_dataframe | 2-5ms | Disk I/O (pickle read) |
| update_dataframe | 10-15ms | Disk I/O (pickle write) |
| Memory overhead | ~2x DataFrame size | Python objects + pickle files |

#### RedisBackend

| Metric | Value | Notes |
|--------|-------|-------|
| create_session | 10-20ms | Network + PyArrow serialization |
| get_dataframe | 5-15ms | Network + deserialization |
| update_dataframe | 15-25ms | Network + serialization |
| create_version | 30-60ms | Distributed lock + LIST operations |
| Memory overhead | ~1.3x DataFrame size | Compressed PyArrow format |
| Compression ratio | 60-80% | Snappy compression |

### Performance Comparison

**PyArrow vs Pickle** (from unit tests):
- Serialization speed: PyArrow 3-5x faster
- Deserialization speed: PyArrow 2-4x faster
- Size: PyArrow ~30% smaller (before compression)
- With compression: PyArrow + Snappy ~70% smaller

**Throughput** (from load tests):
- InMemory: 500-1000 reads/sec, 100-200 writes/sec
- Redis (local): 200-500 reads/sec, 50-100 writes/sec
- Redis (network): 50-200 reads/sec, 20-50 writes/sec

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run unit tests
        run: |
          cd backend
          pytest tests/unit -v -m unit

      - name: Run integration tests
        run: |
          cd backend
          pytest tests/integration -v -m integration
        env:
          REDIS_ENABLED: true
          REDIS_URL: redis://localhost:6379/0

      - name: Generate coverage
        run: |
          cd backend
          pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd backend
pytest tests/unit -v -m "unit and fast"
exit $?
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

**Symptom**:
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Solution**:
```bash
# Check if Redis is running
docker-compose ps

# Start Redis
docker-compose up redis -d

# Verify connectivity
redis-cli -h localhost -p 6379 ping
```

#### 2. PyArrow Import Error

**Symptom**:
```
ImportError: No module named 'pyarrow'
```

**Solution**:
```bash
pip install pyarrow==17.0.0
```

#### 3. Test Timeout

**Symptom**:
```
FAILED tests/load/test_performance.py::test_stress - Timeout
```

**Solution**:
Increase timeout in `pytest.ini`:
```ini
[pytest]
timeout = 600  # Increase to 10 minutes for slow machines
```

Or skip slow tests:
```bash
pytest tests/ -v -m "not slow"
```

#### 4. Memory Error During Load Tests

**Symptom**:
```
MemoryError: Unable to allocate array
```

**Solution**:
- Reduce test data size in `conftest.py`
- Close other applications
- Skip load tests: `pytest tests/ -v -m "not load"`

#### 5. Permission Denied (Storage Directory)

**Symptom**:
```
PermissionError: [Errno 13] Permission denied: 'storage/sessions'
```

**Solution**:
```bash
# Fix permissions
chmod -R 755 storage/

# Or clean and recreate
rm -rf storage/
mkdir -p storage/sessions
```

### Test Debugging

#### Run with Verbose Output

```bash
pytest tests/ -v -s  # -s shows print statements
```

#### Run with Debug Logging

```bash
pytest tests/ -v --log-cli-level=DEBUG
```

#### Run Single Test with Debugger

```bash
pytest tests/unit/test_serializer.py::test_pyarrow_faster_than_pickle -v -s --pdb
```

#### Check Test Discovery

```bash
pytest --collect-only tests/
```

---

## Test Markers Reference

Available markers (defined in `pytest.ini`):

| Marker | Purpose | Example |
|--------|---------|---------|
| `unit` | Unit tests (fast, isolated) | `@pytest.mark.unit` |
| `integration` | Integration tests (require dependencies) | `@pytest.mark.integration` |
| `load` | Load/performance tests (slow) | `@pytest.mark.load` |
| `redis` | Requires Redis connection | `@pytest.mark.redis` |
| `slow` | Tests taking > 5 seconds | `@pytest.mark.slow` |
| `fast` | Tests taking < 1 second | `@pytest.mark.fast` |
| `concurrency` | Multi-threading tests | `@pytest.mark.concurrency` |

### Example Usage

```python
@pytest.mark.unit
@pytest.mark.fast
def test_simple_function():
    """Quick unit test."""
    pass

@pytest.mark.integration
@pytest.mark.redis
@pytest.mark.slow
def test_redis_workflow(redis_backend):
    """Full Redis workflow test."""
    pass
```

---

## Next Steps

### After Tests Pass

1. ✅ Review coverage report: `htmlcov/index.html`
2. ✅ Run tests in staging environment
3. ✅ Configure production Redis
4. ✅ Set up monitoring (Grafana + Prometheus)
5. ✅ Enable feature flag: `REDIS_ENABLED=true`
6. ✅ Monitor `/health/storage` endpoint

### Continuous Improvement

- Add more edge case tests as issues are discovered
- Monitor production performance and adjust benchmarks
- Add integration tests for new features
- Keep test execution time under 5 minutes total

---

## Additional Resources

- **Main Documentation**: `MIGRACION_REDIS_COMPLETA.md`
- **Stage 1 Details**: `ETAPA1_COMPLETADA.md`
- **Stage 2 Details**: `ETAPA2_COMPLETADA.md`
- **Stage 3 Details**: `ETAPA3_COMPLETADA.md`
- **Pytest Documentation**: https://docs.pytest.org/
- **Redis Testing**: https://redis.io/docs/getting-started/

---

## Summary

This comprehensive test suite ensures:

✅ **Zero Breaking Changes**: Both backends pass identical tests
✅ **Performance**: Redis meets production latency/throughput targets
✅ **Reliability**: Graceful fallback and error handling validated
✅ **Scalability**: Concurrency and stress tests confirm multi-worker support
✅ **Maintainability**: High coverage (>85%) and clear test organization

**Total Test Count**: ~100+ tests across 3 categories
**Total Runtime**: Unit (5s) + Integration (30s) + Load (300s) = ~5-6 minutes

Happy testing! 🚀
