import { Leaf, Twitter, Github, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-hero rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-gradient-hero">
                FUN FARM
              </span>
            </div>
            <p className="text-muted-foreground mb-6">
              {t('footer.tagline')}<br />
              {t('footer.slogan')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors">
                <Twitter className="w-5 h-5 text-muted-foreground" />
              </a>
              <a href="#" className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </a>
              <a href="#" className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors">
                <Github className="w-5 h-5 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t('footer.platform')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.marketplace')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.socialNetwork')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.angelAI')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.camlyToken')}</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t('footer.resources')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.documentation')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.whitepaper')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.blog')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.faq')}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.privacyPolicy')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.termsOfService')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.cookiePolicy')}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('footer.domain')} <span className="text-primary font-medium">Farm.Fun.Rich</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
