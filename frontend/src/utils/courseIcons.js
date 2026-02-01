import {
    Code, Server, Database, Globe, Cpu, Smartphone,
    Palette, PenTool, Layout, Video, Camera,
    BarChart, TrendingUp, DollarSign, Briefcase,
    Shield, Lock, Wifi, Terminal,
    BookOpen, Layers, Monitor, Search
} from 'lucide-react';

/**
 * Returns a Lucide icon component based on the course category or title.
 * @param {string} category - The course category.
 * @param {string} title - The course title (fallback).
 * @returns {React.Component} - The Lucide icon component.
 */
export const getCourseIcon = (category, title = '') => {
    const term = (category || title).toLowerCase();

    // Map keywords to icons
    if (term.includes('web')) return Globe;
    if (term.includes('react') || term.includes('node') || term.includes('js')) return Code;
    if (term.includes('python') || term.includes('data') || term.includes('ai') || term.includes('learning')) return Cpu;
    if (term.includes('design') || term.includes('ui') || term.includes('ux') || term.includes('graphic')) return Palette;
    if (term.includes('mobile') || term.includes('app') || term.includes('flutter') || term.includes('android')) return Smartphone;
    if (term.includes('security') || term.includes('cyber') || term.includes('hack')) return Shield;
    if (term.includes('cloud') || term.includes('aws') || term.includes('azure')) return Server;
    if (term.includes('market') || term.includes('seo') || term.includes('social')) return TrendingUp;
    if (term.includes('video') || term.includes('edit')) return Video;
    if (term.includes('tax') || term.includes('finance') || term.includes('accoun')) return DollarSign;
    if (term.includes('office')) return Briefcase;

    // Default icon
    return BookOpen;
};

/**
 * Returns a color class string based on the category/title.
 */
export const getCourseColor = (category, title = '') => {
    const term = (category || title).toLowerCase();

    if (term.includes('web')) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (term.includes('react') || term.includes('node') || term.includes('js')) return 'text-sky-700 bg-sky-100 border-sky-200';
    if (term.includes('ai') || term.includes('python') || term.includes('data')) return 'text-purple-700 bg-purple-100 border-purple-200';
    if (term.includes('design') || term.includes('graphic')) return 'text-pink-700 bg-pink-100 border-pink-200';
    if (term.includes('mobile') || term.includes('app') || term.includes('android')) return 'text-lime-700 bg-lime-100 border-lime-200';
    if (term.includes('security') || term.includes('cyber')) return 'text-red-700 bg-red-100 border-red-200';
    if (term.includes('cloud') || term.includes('devops')) return 'text-cyan-700 bg-cyan-100 border-cyan-200';
    if (term.includes('market') || term.includes('seo')) return 'text-orange-700 bg-orange-100 border-orange-200';
    if (term.includes('video') || term.includes('media')) return 'text-rose-700 bg-rose-100 border-rose-200';
    if (term.includes('finance') || term.includes('business') || term.includes('tax')) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (term.includes('office') || term.includes('management')) return 'text-slate-700 bg-slate-100 border-slate-200';

    return 'text-indigo-700 bg-indigo-100 border-indigo-200'; // Default
};

/**
 * Returns a style object with icon, text color, background, and gradient.
 */
export const getCourseStyle = (category, title = '') => {
    const term = (category || title).toLowerCase();
    let style = {
        icon: BookOpen,
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        gradient: 'from-indigo-500 to-purple-600'
    };

    if (term.includes('web')) {
        style = { icon: Globe, text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-500 to-cyan-500' };
    } else if (term.includes('react') || term.includes('node') || term.includes('js')) {
        style = { icon: Code, text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', gradient: 'from-sky-500 to-blue-600' };
    } else if (term.includes('ai') || term.includes('python') || term.includes('data')) {
        style = { icon: Cpu, text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', gradient: 'from-purple-500 to-pink-500' };
    } else if (term.includes('design') || term.includes('graphic')) {
        style = { icon: Palette, text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', gradient: 'from-pink-500 to-rose-500' };
    } else if (term.includes('mobile') || term.includes('app') || term.includes('android')) {
        style = { icon: Smartphone, text: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-100', gradient: 'from-lime-500 to-green-500' };
    } else if (term.includes('security') || term.includes('cyber')) {
        style = { icon: Shield, text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', gradient: 'from-red-500 to-orange-500' };
    } else if (term.includes('cloud') || term.includes('devops')) {
        style = { icon: Server, text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', gradient: 'from-cyan-500 to-blue-500' };
    } else if (term.includes('market') || term.includes('seo')) {
        style = { icon: TrendingUp, text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', gradient: 'from-orange-500 to-amber-500' };
    } else if (term.includes('video') || term.includes('media')) {
        style = { icon: Video, text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', gradient: 'from-rose-500 to-pink-600' };
    } else if (term.includes('finance') || term.includes('business') || term.includes('tax')) {
        style = { icon: DollarSign, text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', gradient: 'from-emerald-500 to-teal-500' };
    } else if (term.includes('office') || term.includes('management')) {
        style = { icon: Briefcase, text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', gradient: 'from-slate-700 to-gray-800' };
    }

    return style;
};
