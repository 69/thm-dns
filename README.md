# thm-dns
an experimental dns server that resolves [tryhackme](https://tryhackme.com) room names to ips (i.e. anthem.thm -> 10.10.xxx.xxx)

note that you:
 - will need to run this as root if you want it to bind to port 53.
 - if using the dockerfile, you need to set up the config.json file beforehand as you can't do it once the docker container is built
