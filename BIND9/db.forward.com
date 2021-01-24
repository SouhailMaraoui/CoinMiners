;
; BIND data file for local loopback interface
;
$TTL	604800
@	IN	SOA	ns.coinminers.com. root.localhost. (
			      2		; Serial
			 604800		; Refresh
			  86400		; Retry
			2419200		; Expire
			 604800 )	; Negative Cache TTL
;
@	IN	NS	ns.coinminers.com.
ns	IN	A	127.0.0.2
www 	IN	A	127.0.0.2
mail	IN	A	127.0.0.3
admin	IN	A	127.0.0.4
