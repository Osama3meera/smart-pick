export const SITE_TITLE = 'Smart Pick';
export const SITE_DESCRIPTION = 'Honest guides and smart product picks to help you choose with confidence.';
export const SITE_OWNER = 'Smart Pick';
export const CONTACT_EMAIL = 'osamahasan3meera@gmail.com';

export const PINTEREST_DOMAIN_VERIFY = '';

export const AFFILIATE_DISCLOSURE =
	'This post contains affiliate links. If you buy through them, I may earn a commission at no extra cost to you.';

export const HEALTH_DISCLAIMER =
	'This content is for informational purposes only and is not medical advice. Talk to your doctor before starting any new diet, supplement, or exercise program.';

export const CATEGORIES = [
	{
		slug: 'health-fitness',
		name: 'Health & Fitness',
		description: 'Workouts, healthy eating, weight management, and wellness tips.',
		healthDisclaimer: true,
	},
	{
		slug: 'self-help',
		name: 'Self-Help',
		description: 'Habits, productivity, confidence, and personal growth.',
		healthDisclaimer: false,
	},
	{
		slug: 'home-garden',
		name: 'Home & Garden',
		description: 'DIY projects, gardening, and making your home better.',
		healthDisclaimer: false,
	},
	{
		slug: 'cooking-food',
		name: 'Cooking & Food',
		description: 'Recipes, meal ideas, and kitchen tips.',
		healthDisclaimer: false,
	},
	{
		slug: 'relationships',
		name: 'Relationships',
		description: 'Dating, marriage, and family advice.',
		healthDisclaimer: false,
	},
	{
		slug: 'parenting-family',
		name: 'Parenting & Family',
		description: 'Tips and tools for parents and families.',
		healthDisclaimer: false,
	},
	{
		slug: 'pets',
		name: 'Pets',
		description: 'Training, care, and products for your pets.',
		healthDisclaimer: false,
	},
	{
		slug: 'spirituality',
		name: 'Spirituality',
		description: 'Mindfulness, meditation, and inner peace.',
		healthDisclaimer: false,
	},
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function getCategory(slug: string) {
	return CATEGORIES.find((category) => category.slug === slug);
}
