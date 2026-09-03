import {
  calculateOperationalCoverage,
  isLeadershipRole,
} from './map-analytics.js';

describe('map analytics', () => {
  it.each([
    'Líder',
    'LIDER DE REGIAO',
    'Coordenador Regional',
    'Coordenação de Equipe',
  ])('identifica liderança em %s', roleName => {
    expect(
      isLeadershipRole(roleName),
    ).toBe(true);
  });

  it.each([
    'Motorista',
    'Panfletagem',
    'Apoio',
    undefined,
  ])('não classifica %s como liderança', roleName => {
    expect(
      isLeadershipRole(roleName),
    ).toBe(false);
  });

  it('aplica os três níveis de cobertura', () => {
    expect(
      calculateOperationalCoverage({
        peopleCount: 1,
        leadershipCount: 1,
      }).level,
    ).toBe('LOW');

    expect(
      calculateOperationalCoverage({
        peopleCount: 7,
        leadershipCount: 1,
      }).level,
    ).toBe('MEDIUM');

    expect(
      calculateOperationalCoverage({
        peopleCount: 8,
        leadershipCount: 1,
      }).level,
    ).toBe('GOOD');

    expect(
      calculateOperationalCoverage({
        peopleCount: 20,
        leadershipCount: 0,
      }).level,
    ).toBe('LOW');
  });
});
