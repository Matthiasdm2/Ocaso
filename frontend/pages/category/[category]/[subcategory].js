import AdsList from '../../components/AdsList.js';

export default function CategoryPage({ category, subcategory }) {
    return (
        <div>
            <h1>{category} - {subcategory}</h1>
            <AdsList category={category} subcategory={subcategory} />
        </div>
    );
}