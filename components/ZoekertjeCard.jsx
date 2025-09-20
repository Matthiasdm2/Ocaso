
const ZoekertjeCard = ({ zoekertje }) => {
  return (
    <div className="zoekertje-card">
      <div className="zoekertje-header">
        <h2>{zoekertje.title}</h2>
      </div>
      <div className="zoekertje-body">
        <p>{zoekertje.description}</p>
      </div>
      <div className="zoekertje-icons">
        <span>
          <i className="fa fa-eye" /> {zoekertje.views}
        </span>
        <span>
          <i className="fa fa-heart" /> {zoekertje.favorites}
        </span>
      </div>
    </div>
  );
};

export default ZoekertjeCard;