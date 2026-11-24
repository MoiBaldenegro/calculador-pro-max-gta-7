# Handoff
- Issue #12: el deploy falla con "Get Pages site failed ... Not Found": Pages no está habilitado en el repo. El workflow es correcto; no es arreglable desde código (GITHUB_TOKEN no puede habilitar Pages).
- Siguiente paso: una persona debe poner Settings → Pages → Source = GitHub Actions y relanzar el workflow.
