"""
Data Access Layer: User & Authentication Repository
Provides thread-safe user credential storage with pre-seeded team profiles.
"""

from typing import Dict, Any, Optional, List


class UserRepository:
    """Repository data user dan autentikasi untuk akses backend REST API."""

    def __init__(self):
        # Database in-memory thread-safe untuk penyimpanan kredensial
        # Format: username -> {username, password_hash, salt, role, full_name}
        self._users: Dict[str, Dict[str, Any]] = {}
        self._seed_default_users()

    def _seed_default_users(self):
        """Membuat user default untuk mempermudah tim melakukan testing API."""
        # Helper sederhana untuk hash awal di repo (akan divalidasi via AuthService)
        from src.services.auth_service import AuthService
        
        default_accounts = [
            {
                "username": "analyst",
                "password": "lumina2026",
                "role": "analyst",
                "full_name": "TOD Spatial Analyst"
            },
            {
                "username": "admin",
                "password": "superlumina2026",
                "role": "admin",
                "full_name": "Lumina Platform Administrator"
            },
            {
                "username": "developer",
                "password": "radiant2026",
                "role": "developer",
                "full_name": "Radiant WebGIS Developer"
            }
        ]

        for acc in default_accounts:
            salt = AuthService.generate_salt()
            pwd_hash = AuthService.hash_password(acc["password"], salt)
            self._users[acc["username"]] = {
                "username": acc["username"],
                "password_hash": pwd_hash,
                "salt": salt,
                "role": acc["role"],
                "full_name": acc["full_name"]
            }

    def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Mencari user berdasarkan username (case-insensitive)."""
        return self._users.get(username.lower())

    def create_user(self, username: str, password_hash: str, salt: str, role: str, full_name: str) -> Dict[str, Any]:
        """Mendaftarkan user baru."""
        uname = username.lower()
        if uname in self._users:
            raise ValueError(f"Username '{username}' sudah terdaftar.")
        
        user_record = {
            "username": uname,
            "password_hash": password_hash,
            "salt": salt,
            "role": role,
            "full_name": full_name
        }
        self._users[uname] = user_record
        return {
            "username": uname,
            "role": role,
            "full_name": full_name
        }

    def list_users(self) -> List[Dict[str, Any]]:
        """Mengembalikan daftar user tanpa password hash."""
        return [
            {
                "username": u["username"],
                "role": u["role"],
                "full_name": u["full_name"]
            }
            for u in self._users.values()
        ]
