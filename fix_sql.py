import re

with open('supabase_schema.sql', 'r') as f:
    sql = f.read()

sql = re.sub(
    r'CREATE POLICY "([^"]+)"\s+ON public\.([a-zA-Z_]+)\s+FOR',
    r'DROP POLICY IF EXISTS "\1" ON public.\2;\nCREATE POLICY "\1"\n  ON public.\2 FOR',
    sql
)

with open('supabase_schema.sql', 'w') as f:
    f.write(sql)
