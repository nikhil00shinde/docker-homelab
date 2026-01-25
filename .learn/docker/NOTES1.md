#### Understand Docker

- What is the difference between an image and a container?
    - Image: Blueprint/Recipe (A cake recipe written down)
    - Container: Running Instance (The actual cake you baked from that recipe)
    You can bake multiple cakes (containers) from one recipe (image).

- Images are stored in registries (Docker hub, AWS ECR, gitlab registry)
- One image might have 100+ containers running from it.


- Container should be `immutable` and `ephermeral`.
`docker commit:` - It is used to create a new image from a container's current state, which can be useful for debugging or creating snapshots during development.

### Understand the architecture
```
Kernel
|
|
/

containerd
|
|
/
docker daemon
|
|
/

docker cli, docker gui
```

Check `systemctl status docker`, you will understand thing that how docker create a container, how it interact with different component.

We need to add user to docker group to access the daemon.
`usermod -aG docker $USER`
`sudo newgrp docker` --> to update the group 


Dockerfile (creates) --> Image (creates) --> Containers




### Setup
> Check Docker version
>> `docker --version`

> Check Docker Compose (note: NOT docker-compose, that's old)
>> `docker compose version`

> See running containers 
>> `docker ps`

> See ALL containers
>> `docker ps -a`

> See downloaded Images
>> `docker images`


### First Container 

> Pull and run nginx (a web server)
>> `docker run -d --name my-first-container -p 8080:80 nginx`

> Check it's Running
>> `docker ps`

> See the logs
>> `docker logs my-first-container`

> See resource usage
>> `docker stats my-first-container`

### Explore Inside
> Execute a command inside the running container
>> `docker exec -it my-first-container bash`

> Now you're INSIDE the container! Try:
```
ls
cat /etc/nginx/nginx.conf
exit
```

### Clean up
> Stop the my-first-container
>> `docker stop my-first-container`

> Remove it
>> `docker rm my-first-container`

> Verify it's gone
>> `docker ps -a`


### Other usefull
> Start the container
>> `docker start my-first-container`

> Stop the container
>> `docker stop my-first-container`

> Build the image
>> `docker build -t pokemon-api .`

> Run it 
>> `docker run -d --name pokemon-api -p 3000:3000 pokemon-api`




