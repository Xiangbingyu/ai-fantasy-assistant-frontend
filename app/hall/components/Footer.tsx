'use client';

export default function Footer() {
    return (
        <footer style={{ 
            marginTop: 'auto', 
            padding: '20px 0', 
            backgroundColor: '#f8f9fa', 
            borderTop: '1px solid #e9ecef',
            textAlign: 'center'
        }}>
            <div className="footer-link footer-pad last" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                <p>
                    <span>
                        <a 
                            href="https://beian.miit.gov.cn/#/Integrated/index" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#6c757d', textDecoration: 'none' }}
                        >
                            蜀ICP备2025170897号
                        </a>
                    </span>
                </p>
            </div>
        </footer>
    );
}