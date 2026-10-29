from django.db.backends.mysql.schema import DatabaseSchemaEditor
import pymysql

pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()

# TiDB disallows ADD COLUMN + ADD CONSTRAINT FOREIGN KEY in the same ALTER TABLE statement
DatabaseSchemaEditor.sql_create_column_inline_fk = None
