from django.db.backends.mysql.schema import DatabaseSchemaEditor
from django.db.utils import OperationalError
import pymysql

pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()

# TiDB disallows ADD COLUMN + ADD CONSTRAINT FOREIGN KEY in the same ALTER TABLE statement
DatabaseSchemaEditor.sql_create_column_inline_fk = None

_orig_execute = DatabaseSchemaEditor.execute


def _tidb_safe_execute(self, sql, params=()):
    try:
        return _orig_execute(self, sql, params)
    except OperationalError as exc:
        # TiDB (error 8200) is already utf8mb4 and disallows converting collation on indexed columns
        if exc.args and exc.args[0] == 8200:
            return None
        raise


DatabaseSchemaEditor.execute = _tidb_safe_execute
