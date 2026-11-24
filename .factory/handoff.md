# Handoff
- Issue #12: deploy.yml es correcto; el fallo era Pages no habilitado (configure-pages Not Found). El humano indicó que ya se activó en el repo; la publicación de este cambio dispara el workflow (push a main) para re-verificar.
- Siguiente paso: si el workflow sigue fallando con Not Found, confirmar Settings → Pages → Source = "GitHub Actions" (no solo Actions habilitado).
