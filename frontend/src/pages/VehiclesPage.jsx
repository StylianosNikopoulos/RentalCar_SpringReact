import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import vehicleService from '../services/vehicleService';
import { useQuery } from '@tanstack/react-query';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/vehicles.css'; 

const VehiclesPage = () => {
    const { lang } = useLang();
    const t = translations[lang].vehicles;

    useEffect(() => {
        document.title = `RentalCar | ${t.pageTitle}`;
    }, [t.pageTitle]);

    const navigate = useNavigate();
    const location = useLocation(); 
    
    const queryParams = new URLSearchParams(location.search);
    const selectedStart = queryParams.get('start');
    const selectedEnd = queryParams.get('end');
    const brand = queryParams.get('brand') || '';
    const fuelType = queryParams.get('fuelType') || '';
    const minPrice = queryParams.get('minPrice') || '';
    const maxPrice = queryParams.get('maxPrice') || '';
    const [searchTerm, setSearchTerm] = useState(queryParams.get('search') || '');
    const [sortOrder, setSortOrder] = useState(queryParams.get('sort') || 'default');
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const itemsPerPage = 9;
    const priceOptions = [0, 25, 50, 75, 100, 150, 200, 300, 500];

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [currentPage]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearchTerm(params.get('search') || '');
        setSortOrder(params.get('sort') || 'default');
        setCurrentPage(1);
    }, [location.search]);

    const updateFiltersInUrl = (updates) => {
        const params = new URLSearchParams(location.search);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '' || (key === 'sort' && value === 'default')) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        const nextQuery = params.toString();
        navigate(nextQuery ? `/vehicles?${nextQuery}` : '/vehicles', { replace: true });
    };

    const rentalDays = selectedStart && selectedEnd 
        ? Math.max(1, Math.ceil((new Date(selectedEnd) - new Date(selectedStart)) / (1000 * 60 * 60 * 24)))
        : 0;

    const { data: responseData = {}, isLoading, isError, refetch } = useQuery({
        queryKey: ['vehicles', selectedStart, selectedEnd, currentPage, sortOrder, searchTerm, brand, fuelType, minPrice, maxPrice],
        queryFn: async () => {
            const filters = { brand, fuelType, minPrice, maxPrice };
            if (selectedStart && selectedEnd) {
                return await vehicleService.getAvailableVehicles(selectedStart, selectedEnd, currentPage - 1, itemsPerPage, sortOrder, searchTerm, filters);
            }
            return await vehicleService.getAllVehicles(currentPage - 1, itemsPerPage, sortOrder, searchTerm, filters);
        },
        staleTime: 1000 * 60 * 5,
        keepPreviousData: true
    });

    const { data: brandsResponseData = {}, isLoading: isBrandsLoading } = useQuery({
        queryKey: ['vehicle-filter-brands'],
        queryFn: () => vehicleService.getAllVehicles(0, 100, 'default', ''),
        staleTime: 1000 * 60 * 5
    });

    const currentItems = responseData.content || [];
    const totalPages = responseData.page?.totalPages || 1;
    const totalResults = responseData.page?.totalElements ?? currentItems.length;
    const hasActiveFilters = Boolean(brand || fuelType || minPrice || maxPrice || searchTerm);

    const brandOptions = useMemo(() => {
        return [...new Set([...(brandsResponseData.content || []).map((car) => car.brand), brand]
            .filter(Boolean))].sort();
    }, [brand, brandsResponseData.content]);

    const handleSearch = (e) => {
        updateFiltersInUrl({ search: e.target.value });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString(lang === 'gr' ? 'el-GR' : 'en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }); 
    };

    const handleCardClick = (carId) => {
        const searchPath = location.search ? location.search : "";
        navigate(`/vehicle/${carId}${searchPath}`);
    };

    const handleCardKeyDown = (event, carId) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick(carId);
        }
    };

    if (isError) {
        return (
            <div className="error-message">
                <div>
                    <i className="fas fa-cloud-exclamation"></i>
                    <p>{t.errorMsg}</p>
                    <button className="clear-dates-btn" onClick={() => refetch()}>{t.retry}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vehicles-page">
            <div className="vehicles-header">
                <span className="fleet-eyebrow">{t.fleetSearch}</span>
                <h1>{t.pageTitle}</h1>
                <p className="fleet-intro">
                    {selectedStart && selectedEnd ? t.introWithDates : t.introWithoutDates}
                </p>

                {selectedStart && selectedEnd && (
                    <div className="availability-info-banner">
                        <div className="availability-text">
                            <i className="far fa-calendar-check"></i>
                            <span>{t.showingAvailable} </span>
                            <strong>{formatDate(selectedStart)}</strong>
                            <span className="date-separator">→</span>
                            <strong>{formatDate(selectedEnd)}</strong>
                            <span className="days-badge">({rentalDays} {rentalDays === 1 ? t.daySingle : t.daysPlural})</span>
                        </div>
                        <button className="clear-dates-btn" onClick={() => updateFiltersInUrl({ start: '', end: '' })}>
                            <i className="fas fa-undo-alt" style={{ fontSize: '0.85rem' }}></i> {t.btnResetDates}
                        </button>
                    </div>
                )}
                
                <div className="filters-bar">
                    <div className="search-container">
                        <i className="fas fa-search search-icon"></i>
                        <input 
                            type="text" 
                            placeholder={t.searchPlaceholder} 
                            className="search-input"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    {hasActiveFilters && (
                        <div className="active-filter-chips" aria-label={t.activeFilters}>
                            {searchTerm && <button type="button" onClick={() => updateFiltersInUrl({ search: '' })}>{t.searchLabel}: {searchTerm} <i className="fas fa-times" /></button>}
                            {brand && <button type="button" onClick={() => updateFiltersInUrl({ brand: '' })}>{brand} <i className="fas fa-times" /></button>}
                            {fuelType && <button type="button" onClick={() => updateFiltersInUrl({ fuelType: '' })}>{fuelType === 'PETROL' ? t.fuelPetrol : fuelType === 'DIESEL' ? t.fuelDiesel : fuelType === 'HYBRID' ? t.fuelHybrid : t.fuelElectric} <i className="fas fa-times" /></button>}
                            {(minPrice || maxPrice) && <button type="button" onClick={() => updateFiltersInUrl({ minPrice: '', maxPrice: '' })}>€{minPrice || '0'} - €{maxPrice || '∞'} <i className="fas fa-times" /></button>}
                        </div>
                    )}
                </div>
            </div>

            <div className="vehicles-content-layout">
                <main className="vehicles-results">
                    <div className="results-toolbar">
                        <span>{totalResults} {totalResults === 1 ? t.singleVehicle : t.pluralVehicles} {t.found}</span>
                        <button
                            type="button"
                            className="mobile-filters-toggle"
                            aria-expanded={isMobileFiltersOpen}
                            aria-controls="vehicle-filters"
                            onClick={() => setIsMobileFiltersOpen((isOpen) => !isOpen)}
                        >
                            <i className="fas fa-filter" aria-hidden="true"></i>
                            {t.filtersTitle}
                        </button>
                        <label>{t.sortBy}<select className="sort-select" value={sortOrder} onChange={(e) => updateFiltersInUrl({ sort: e.target.value })}>
                            <option value="default">{t.sortFeatured}</option>
                            <option value="low">{t.sortLowHigh}</option>
                            <option value="high">{t.sortHighLow}</option>
                        </select></label>
                    </div>

                <aside
                    id="vehicle-filters"
                    className={`vehicle-filter-sidebar${isMobileFiltersOpen ? ' is-open' : ''}`}
                    aria-label={t.filtersTitle}
                >
                    <div className="filter-sidebar-heading">
                        <div>
                            <p>{t.findCarSub}</p>
                            <h2>{t.filtersTitle}</h2>
                        </div>
                        <button type="button" className="sidebar-clear-button" onClick={() => updateFiltersInUrl({ brand: '', fuelType: '', minPrice: '', maxPrice: '' })}>
                            {t.clearFilters}
                        </button>
                    </div>

                    <section className="filter-section">
                        <label className="filter-control-label" htmlFor="vehicle-brand">{t.brandTitle}</label>
                        <select id="vehicle-brand" className="filter-control" value={brand} onChange={(event) => updateFiltersInUrl({ brand: event.target.value })}>
                            <option value="">{t.allBrands}</option>
                            {brandOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        {isBrandsLoading && <small>{t.fetching}</small>}
                    </section>

                    <section className="filter-section">
                        <h3>{t.fuelTypeTitle}</h3>
                        {[
                            ['', t.allFuelTypes], 
                            ['PETROL', t.fuelPetrol], 
                            ['DIESEL', t.fuelDiesel], 
                            ['HYBRID', t.fuelHybrid], 
                            ['ELECTRIC', t.fuelElectric]
                        ].map(([value, label]) => (
                            <label className="filter-option" key={label}><input type="radio" name="fuelType" checked={fuelType === value} onChange={() => updateFiltersInUrl({ fuelType: value })} /><span>{label}</span></label>
                        ))}
                    </section>

                    <section className="filter-section">
                        <h3>{t.pricePerDay}</h3>
                        <div className="price-selects">
                            <label>{t.priceFrom}<select value={minPrice} onChange={(event) => {
                                const value = event.target.value;
                                updateFiltersInUrl({ minPrice: value, ...(maxPrice && Number(value) > Number(maxPrice) ? { maxPrice: value } : {}) });
                            }}><option value="">-</option>{priceOptions.map((price) => <option key={price} value={price}>€{price}</option>)}</select></label>
                            <label>{t.priceTo}<select value={maxPrice} onChange={(event) => {
                                const value = event.target.value;
                                updateFiltersInUrl({ maxPrice: value, ...(minPrice && value && Number(value) < Number(minPrice) ? { minPrice: value } : {}) });
                            }}><option value="">-</option>{priceOptions.map((price) => <option key={price} value={price}>€{price}</option>)}</select></label>
                        </div>
                    </section>
                </aside>

            {isLoading ? (
                <div className="loader-container">
                    <div className="loader"></div>
                    <span className="loader-text">{t.fetching}</span>
                </div>
            ) : currentItems.length === 0 ? (
                <div className="no-results">
                    <i className="fas fa-search"></i>
                    <h3>{selectedStart && selectedEnd ? t.noAvailabilityTitle : t.noResultsTitle}</h3>
                    <p>{selectedStart && selectedEnd ? t.noAvailability : t.noResults}</p>
                    <button className="clear-dates-btn" onClick={() => selectedStart && selectedEnd ? updateFiltersInUrl({ start: '', end: '' }) : updateFiltersInUrl({ search: '', brand: '', fuelType: '', minPrice: '', maxPrice: '' })}>
                        {selectedStart && selectedEnd ? t.changeDates : t.clearFilters}
                    </button>
                </div>
            ) : (
                <>
                    <div className="vehicle-grid">
                        {currentItems.map(car => (
                            <article
                                key={car.id}
                                className="vehicle-item"
                                onClick={() => handleCardClick(car.id)}
                                onKeyDown={(event) => handleCardKeyDown(event, car.id)}
                                role="link"
                                tabIndex={0}
                                aria-label={`${t.viewDetailsFor} ${car.brand} ${car.model}`}
                            >
                                <div className="vehicle-img-wrapper">
                                    <img 
                                        src={
                                            car.images && car.images.length > 0 
                                                ? (car.images.find(img => img.isMain)?.url || car.images[0].url) 
                                                : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070'
                                        } 
                                        alt={`${car.brand} ${car.model}`} 
                                        className="vehicle-img" 
                                    />
                                    <span className="type-tag"><i className="fas fa-check-circle"></i> {t.availableNow}</span>
                                </div>
                                
                                <div className="vehicle-card-body">
                                    <div className="vehicle-title-section">
                                        <h3 className="car-name">{car.brand} <span>{car.model}</span></h3>
                                        <span className="car-year">{car.year}</span>
                                    </div>

                                    <div className="card-mini-specs">
                                        <span><i className="fas fa-gas-pump"></i> {car.fuelType}</span>
                                        <span><i className="fas fa-calendar-alt"></i> {car.year}</span>
                                    </div>

                                    <div className="card-pricing-footer">
                                        <div className="car-price-tag">
                                            <span className="price-value">€{car.dailyPrice}</span>
                                            <span className="price-label">/ {t.perDay}</span>
                                        </div>
                                        
                                        {rentalDays > 0 && (
                                            <div className="total-price-badge">
                                                <span>{t.totalFor} {rentalDays} {rentalDays === 1 ? t.daySingle : t.daysPlural}</span>
                                                <strong>€{(car.dailyPrice * rentalDays).toFixed(0)}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rent-btn-minimal">
                                    {t.viewRentalDetails} <i className="fas fa-arrow-right"></i>
                                </div>
                            </article>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1} 
                                className="page-btn"
                            >
                                <i className="fas fa-chevron-left"></i> {t.btnPrevious}
                            </button>
                            <span className="page-info">{t.page} {currentPage} {t.of} {totalPages}</span>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages} 
                                className="page-btn"
                            >
                                {t.btnNext} <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
                </main>
            </div>
        </div>
    );
};

export default VehiclesPage;
