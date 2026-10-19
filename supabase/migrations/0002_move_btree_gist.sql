-- 보안 advisor 경고(extension_in_public) 해소: btree_gist를 public이 아닌 extensions 스키마로 이동
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
