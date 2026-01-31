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

    if (term.includes('web')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (term.includes('ai') || term.includes('python')) return 'text-purple-600 bg-purple-50 border-purple-100';
    if (term.includes('design')) return 'text-pink-600 bg-pink-50 border-pink-100';
    if (term.includes('security')) return 'text-red-600 bg-red-50 border-red-100';
    if (term.includes('market')) return 'text-orange-600 bg-orange-50 border-orange-100';

    return 'text-indigo-600 bg-indigo-50 border-indigo-100'; // Default
};
