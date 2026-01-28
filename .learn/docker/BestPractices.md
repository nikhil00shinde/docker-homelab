## Best Practices Docker

### Docker Base Images 
1. We only need runtime dependencies, forget about full distribution images, instead reach for alpine, slim variants, distroless, scratch images. 
Smaller image means smaller attack surface, faster pools and less storage.

***Compiled languages:*** Go and Rust
    - Distroless & Scratch images are best bets 

***Interpreted Languages:*** Nodejs and python
    -  We will need the runtime,  alpine and slim variants make sense.


2. Use multi-stage builds
-  seperate build dependencies from runtime

3. Derive the version from the project



### Layer Caching
1. Docker caches each layer, if something changes its invalidates that layer and everything after it.
    - Put the thing that change rarely  at the top, and the thing that change often at the bottom.
- Base Images
- Dependency Manifest
- Configuration 
-  Source code

2. Combine `RUN` command
```
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid
``` 
- Cleaning Caches

3. Explicit Copy 
`COPY . .` --> **WRONG**
Be verbose


### Security
- Never use container as `root` user
- Pin image version
- Use official images
- Keep it minimal: never embed secrets
- No sudo (To use it, use different build stage)
- `COPY` over `ADD`
- No debugging tool (`wget`, `curl`, `vim`, `netcat`)
    - Use ephemeral debug containers for DEBUGGING
- Executables owned by root: Application binaries should be owned by root but executed by `non-root` user.


### Maintainbility best Practices
- Sort by arguments
- use `WORKDIR` (WORKDIR: sets the directory for all subsequent instructions makes our dockerfile easier to read)
- Exec form for CMD 
    - `CMD ["nginx", "-g", "daemon off;"]`
        - It run our process as child of /bin/sh
- Comment non-obvious decision
- Add OCI label
