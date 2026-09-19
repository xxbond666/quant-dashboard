import { APP_NAME } from "@/lib/app-config";

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-background text-foreground">
            <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 md:flex-row">
                <div className="text-sm text-muted-foreground">
                    © {year} {APP_NAME}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
