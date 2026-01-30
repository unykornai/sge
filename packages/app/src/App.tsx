import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import Register from './pages/Register';
import Claim from './pages/Claim';
import Header from './components/Header';
import Footer from './components/Footer';
import ChainGuard from './components/ChainGuard';

function App() {
  const location = useLocation();
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <div className="container">
      <Header />
      
      <nav className="nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Register
        </Link>
        <Link to="/claim" className={location.pathname === '/claim' ? 'active' : ''}>
          Claim
        </Link>
      </nav>

      {isConnected && chainId !== 1 && <ChainGuard />}

      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/claim" element={<Claim />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
