"""
Cross-platform SSL Certificate Generator using Python Cryptography.
Generates 4096-bit RSA certificate with Subject Alternative Names (SAN)
for local development, offline table LANs, and staging verification.
"""
import os
import datetime
from ipaddress import IPv4Address
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_self_signed_cert():
    ssl_dir = os.path.join(os.path.dirname(__file__), "ssl")
    os.makedirs(ssl_dir, exist_ok=True)
    
    key_path = os.path.join(ssl_dir, "smart_table.key")
    cert_path = os.path.join(ssl_dir, "smart_table.crt")
    
    print("Generating 4096-bit RSA Private Key...")
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
    )
    
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Smart Interactive Dining Table Platform"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])
    
    san_list = [
        x509.DNSName("localhost"),
        x509.DNSName("smarttable.local"),
        x509.DNSName("smart-table.lan"),
        x509.IPAddress(IPv4Address("127.0.0.1")),
        x509.IPAddress(IPv4Address("192.168.1.100")),
    ]
    
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365 * 3))  # 3 year validity
        .add_extension(
            x509.SubjectAlternativeName(san_list),
            critical=False,
        )
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=None),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )
    
    # Write Private Key
    with open(key_path, "wb") as f:
        f.write(
            key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
        
    # Write Certificate
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
        
    print(f"Generated SSL Key at:  {key_path}")
    print(f"Generated SSL Cert at: {cert_path}")

if __name__ == "__main__":
    generate_self_signed_cert()
