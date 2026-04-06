import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <span className="font-display text-2xl font-bold">Mlečni </span>
            <span className="font-handwritten text-3xl text-primary">put</span>
            <p className="font-handwritten text-xl text-primary/80 mt-2">
              "Uz pravo mleko nema straha"
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg font-bold mb-4">Linkovi</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="font-body text-sm text-background/70 hover:text-background transition-colors">Početna</Link>
              <Link to="/partner" className="font-body text-sm text-background/70 hover:text-background transition-colors">Postani Partner</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-lg font-bold mb-4">Kontakt</h4>
            <p className="font-body text-sm text-background/70">sales@mlecniput.com</p>
            <p className="font-body text-sm text-background/70">+381 69 150 4002</p>
            <p className="font-body text-sm text-background/70">​</p>
          </div>
        </div>
        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="font-body text-sm text-background/50">© 2026 Mlečni put. Sva prava zadržana.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
