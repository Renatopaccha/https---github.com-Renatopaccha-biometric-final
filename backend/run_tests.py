"""
Test runner script for Biometric Backend.

Runs different test suites and generates reports.
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, description):
    """Run command and print results."""
    print("\n" + "=" * 70)
    print(f"  {description}")
    print("=" * 70)

    result = subprocess.run(cmd, shell=True)

    if result.returncode != 0:
        print(f"\n❌ {description} FAILED")
        return False
    else:
        print(f"\n✅ {description} PASSED")
        return True


def main():
    """Main test runner."""
    print("\n" + "=" * 70)
    print("  BIOMETRIC BACKEND - TEST SUITE")
    print("  Redis Migration Testing (Etapas 1-3)")
    print("=" * 70)

    results = {}

    # 1. Unit Tests (fast)
    results["unit"] = run_command(
        "pytest tests/unit -v -m unit --tb=short",
        "Unit Tests (fast, no dependencies)"
    )

    # 2. Integration Tests (require Redis)
    print("\n📋 Integration tests require Redis running")
    print("   Start with: docker-compose up redis -d")

    user_input = input("\nRun integration tests? (y/N): ")
    if user_input.lower() == 'y':
        results["integration"] = run_command(
            "pytest tests/integration -v -m integration --tb=short",
            "Integration Tests (require Redis)"
        )
    else:
        results["integration"] = None
        print("⏭️  Skipping integration tests")

    # 3. Load Tests (slow)
    user_input = input("\nRun load/performance tests? (y/N): ")
    if user_input.lower() == 'y':
        results["load"] = run_command(
            "pytest tests/load -v -m load --tb=short",
            "Load/Performance Tests (slow)"
        )
    else:
        results["load"] = None
        print("⏭️  Skipping load tests")

    # 4. All tests (comprehensive)
    user_input = input("\nRun ALL tests (comprehensive)? (y/N): ")
    if user_input.lower() == 'y':
        results["all"] = run_command(
            "pytest tests/ -v --tb=short",
            "All Tests (comprehensive)"
        )
    else:
        results["all"] = None

    # Summary
    print("\n" + "=" * 70)
    print("  TEST SUMMARY")
    print("=" * 70)

    for test_type, result in results.items():
        if result is None:
            status = "⏭️  SKIPPED"
        elif result:
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"

        print(f"  {test_type.upper():20} {status}")

    print("=" * 70)

    # Generate coverage report (optional)
    user_input = input("\nGenerate coverage report? (y/N): ")
    if user_input.lower() == 'y':
        print("\nGenerating coverage report...")
        subprocess.run("pytest --cov=app --cov-report=html --cov-report=term", shell=True)
        print("\n📊 Coverage report generated: htmlcov/index.html")

    # Exit code
    failed_tests = [k for k, v in results.items() if v is False]
    if failed_tests:
        print(f"\n❌ Some tests failed: {', '.join(failed_tests)}")
        sys.exit(1)
    else:
        print("\n✅ All executed tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
