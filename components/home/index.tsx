import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Bookmark, Edit3, Database, Shield, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomeComponent() {
  const t = useTranslations("Home");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-950">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-32 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl dark:text-white mb-6">
            {t('heroTitle')}
            <span className="text-purple-600"> {t('heroTitleHighlight')}</span>
            <br />
            <span className="text-4xl sm:text-5xl font-medium">{t('heroSubtitle')}</span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-3xl text-xl tracking-tight text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('heroDescription')}
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              className="h-12 px-8 text-lg rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              asChild
            >
              <Link href="/main/bookmarks" className="flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                {t('startManagingBookmarks')}
              </Link>
            </Button>
            
            <Button
              className="h-12 px-8 text-lg rounded-xl bg-white text-purple-600 hover:text-purple-700 border-2 border-purple-200 hover:border-purple-300 dark:bg-slate-800 dark:text-purple-400 dark:border-purple-700 transition-all duration-200"
              variant="outline"
              asChild
            >
              <Link href="/main/blob" className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t('searchSuiObjects')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            {t('coreFeatures')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('coreFeaturesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Bookmark Feature */}
          <Card className="border-purple-100 dark:border-purple-900 hover:shadow-lg transition-all duration-300 hover:border-purple-200 dark:hover:border-purple-800">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Bookmark className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl text-slate-900 dark:text-white">
                {t('bookmarkManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                {t('bookmarkManagementDescription')}
              </CardDescription>
            </CardContent>
          </Card>

          {/* Edit Feature */}
          <Card className="border-purple-100 dark:border-purple-900 hover:shadow-lg transition-all duration-300 hover:border-purple-200 dark:hover:border-purple-800">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Edit3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl text-slate-900 dark:text-white">
                {t('convenientEditing')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                {t('convenientEditingDescription')}
              </CardDescription>
            </CardContent>
          </Card>

          {/* Security Feature */}
          <Card className="border-purple-100 dark:border-purple-900 hover:shadow-lg transition-all duration-300 hover:border-purple-200 dark:hover:border-purple-800">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl text-slate-900 dark:text-white">
                {t('secureAndReliable')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                {t('secureAndReliableDescription')}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 dark:from-purple-800 dark:to-purple-900">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('startManagingYourSuiObjects')}
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            {t('startManagingYourSuiObjectsSubtitle')}
          </p>
          <Button
            className="h-12 px-8 text-lg rounded-xl bg-white text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all duration-200"
            asChild
          >
            <Link href="/main/bookmarks" className="flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                {t('getStartedNow')}
              </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
