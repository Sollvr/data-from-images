import { useEffect, Suspense } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Upload, 
  Tags, 
  Download, 
  Search, 
  Clock,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Users,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "../styles/landing.css";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <motion.div variants={item}>
      <Card className="feature-card h-full">
        <div className="p-6 space-y-4">
          <div className="text-primary">{icon}</div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function LandingContent() {
  const { user } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("Landing page mounted");
    return () => {
      console.log("Landing page unmounted");
    };
  }, []);

  const features = [
    {
      icon: <Upload className="h-10 w-10" />,
      title: "Batch Upload",
      description: "Process multiple images simultaneously with our efficient batch upload system"
    },
    {
      icon: <FileText className="h-10 w-10" />,
      title: "Smart Text Extraction",
      description: "Advanced OCR powered by AI to accurately extract text from any image"
    },
    {
      icon: <Search className="h-10 w-10" />,
      title: "Pattern Recognition",
      description: "Automatically detect dates, amounts, emails, phone numbers, and more"
    },
    {
      icon: <Tags className="h-10 w-10" />,
      title: "Custom Tagging",
      description: "Organize your extractions with custom tags for better content management"
    },
    {
      icon: <Download className="h-10 w-10" />,
      title: "Export Options",
      description: "Export your data in CSV format for seamless integration with other tools"
    },
    {
      icon: <Clock className="h-10 w-10" />,
      title: "Real-time Processing",
      description: "See extraction results instantly with our real-time processing system"
    }
  ];

  const benefits = [
    {
      icon: <Zap className="h-5 w-5" />,
      text: "Advanced AI Technology"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      text: "Secure Data Processing"
    },
    {
      icon: <Upload className="h-5 w-5" />,
      text: "Batch Processing"
    },
    {
      icon: <Search className="h-5 w-5" />,
      text: "Custom Requirements"
    },
    {
      icon: <Download className="h-5 w-5" />,
      text: "Data Export Options"
    },
    {
      icon: <Users className="h-5 w-5" />,
      text: "24/7 Availability"
    }
  ];

  return (
    <ScrollArea className="h-screen w-full">
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="hero-gradient" />
          <div className="container mx-auto px-4 py-24 sm:py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-8"
            >
              <h1 className="text-4xl sm:text-6xl font-bold gradient-text leading-tight">
                Extract Text from Screenshots <br />with AI Precision
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Transform your images into actionable data with our powerful text extraction tool
              </p>
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  size="lg" 
                  className="cta-button"
                  onClick={() => setLocation(user ? "/app" : "/auth")}
                >
                  Get Started
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="cta-button"
                  onClick={() => setLocation("/auth")}
                >
                  Try Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={container}
            className="space-y-12"
          >
            <motion.h2 
              variants={item}
              className="text-3xl sm:text-4xl font-bold text-center gradient-text"
            >
              Powerful Features
            </motion.h2>
            <motion.div 
              variants={container}
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Benefits Section */}
        <section className="bg-muted/50 py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="space-y-12"
            >
              <motion.h2 
                variants={item}
                className="text-3xl sm:text-4xl font-bold text-center"
              >
                Why Choose Us?
              </motion.h2>
              <motion.div 
                variants={container}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={item}
                    className="flex items-center gap-3 p-4 bg-background rounded-lg shadow-sm"
                  >
                    <div className="text-primary">{benefit.icon}</div>
                    <span className="text-lg">{benefit.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden">
          <div className="hero-gradient" />
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl font-bold gradient-text">
                Ready to Transform Your Images?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of users who are already extracting valuable data from their images.
              </p>
              <Button 
                size="lg" 
                className="cta-button"
                onClick={() => setLocation(user ? "/app" : "/auth")}
              >
                Start Extracting Now
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

export default function Landing() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-center text-destructive mb-4">
              Error Loading Landing Page
            </h2>
            <p className="text-center text-muted-foreground">
              There was a problem loading the landing page. Please try refreshing the page.
            </p>
          </Card>
        </div>
      }
    >
      <Suspense fallback={<LoadingSpinner />}>
        <LandingContent />
      </Suspense>
    </ErrorBoundary>
  );
}