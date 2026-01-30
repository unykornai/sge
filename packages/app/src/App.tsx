import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import Register from './pages/Register';
import Claim from './pages/Claim';
import { StatusPage } from './pages/StatusPage';
import AffiliatePortal from './pages/AffiliatePortal';
import AdminPortal from './pages/AdminPortal';
import Header from './components/Header';
import Footer from './components/Footer';
import ChainGuard from './components/ChainGuard';
import EnvironmentBanner from './components/EnvironmentBanner';

function App() {
  const location = useLocation();
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <>
      <EnvironmentBanner />
      <div className="container">
        <Header />
        
        <nav className="nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Register
          </Link>
          <Link to="/claim" className={location.pathname === '/claim' ? 'active' : ''}>
            Claim
          </Link>
          <Link to="/status" className={location.pathname === '/status' ? 'active' : ''}>
            Status
          </Link>
          <Link to="/affiliate" className={location.pathname === '/affiliate' ? 'active' : ''}>
            Affiliate
          </Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            Admin
          </Link>
        </nav>

        {isConnected && chainId !== 1 && <ChainGuard />}

        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/claim" element={<Claim />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/affiliate" element={<AffiliatePortal />} />
          <Route path="/admin" element={<AdminPortal />} />
        </Routes>

        <Footer />
      </div>
    </>
  );
}

export default App;
