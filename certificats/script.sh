openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out key.pem
openssl req -new -key key.pem -out cert.csr -config gei761.conf
openssl ca -in cert.csr -out cert.pem -config gei761.conf

read -p "Press enter to continue"