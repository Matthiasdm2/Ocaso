import { useEffect, useState } from 'react';

function AdsList({ category, subcategory }) {
    const [ads, setAds] = useState([]);

    useEffect(() => {
        fetch(`/api/ads/category/${category}/${subcategory}`)
            .then(res => res.json())
            .then(setAds);
    }, [category, subcategory]);

    return (
        <div>
            {ads.map(ad => (
                <div key={ad.id}>
                    <h2>{ad.title}</h2>
                    <p>{ad.description}</p>
                </div>
            ))}
        </div>
    );
}

export default AdsList;